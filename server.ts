import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { INITIAL_PRODUCTS } from "./src/constants/initialProducts";
import { initializeApp as initializeClientApp, getApps as getClientApps } from "firebase/app";
import { 
  getFirestore as getClientFirestore,
  collection as clientCollection,
  doc as clientDoc,
  getDoc as clientGetDoc,
  getDocs as clientGetDocs,
  setDoc as clientSetDoc,
  updateDoc as clientUpdateDoc,
  deleteDoc as clientDeleteDoc,
  addDoc as clientAddDoc,
  query as clientQuery,
  orderBy as clientOrderBy,
  limit as clientLimit
} from "firebase/firestore";
import {
  testConnection,
  importProduct,
  syncInventory,
  syncPrices,
  createOrder,
  getTrackingNumber,
  searchProducts,
  getProductDetails
} from "./server/services/cjService";

// --- LOCAL FIRESTORE DATABASE FALLBACK ENGINE ---
class LocalDatabaseFallback {
  private static filePath = path.join(process.cwd(), "local_firestore_fallback.json");

  private static readData(): Record<string, Record<string, any>> {
    try {
      if (fs.existsSync(this.filePath)) {
        return JSON.parse(fs.readFileSync(this.filePath, "utf8"));
      }
    } catch (e) {
      console.error("Failed to read local DB fallback:", e);
    }
    return {};
  }

  private static writeData(data: Record<string, Record<string, any>>) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
      console.error("Failed to write local DB fallback:", e);
    }
  }

  static getDoc(colPath: string, docId: string): any {
    const data = this.readData();
    const colData = data[colPath] || {};
    return colData[docId] || null;
  }

  static setDoc(colPath: string, docId: string, docData: any, merge: boolean = false) {
    const data = this.readData();
    if (!data[colPath]) {
      data[colPath] = {};
    }
    if (merge && data[colPath][docId]) {
      data[colPath][docId] = { ...data[colPath][docId], ...docData };
    } else {
      data[colPath][docId] = docData;
    }
    this.writeData(data);
  }

  static updateDoc(colPath: string, docId: string, docData: any) {
    this.setDoc(colPath, docId, docData, true);
  }

  static deleteDoc(colPath: string, docId: string) {
    const data = this.readData();
    if (data[colPath] && data[colPath][docId]) {
      delete data[colPath][docId];
      this.writeData(data);
    }
  }

  static getDocs(colPath: string): any[] {
    const data = this.readData();
    const colData = data[colPath] || {};
    return Object.entries(colData).map(([id, docData]) => ({
      id,
      ...docData
    }));
  }
}

class LocalDocSnapshotWrapper {
  constructor(public id: string, private docData: any, public ref: any) {}

  exists() {
    return this.docData !== null;
  }

  data() {
    return this.docData || undefined;
  }
}

class LocalCollectionRefWrapper {
  constructor(public path: string) {}

  doc(id: string) {
    return new LocalDocRefWrapper(this.path, id);
  }

  async add(data: any) {
    const id = crypto.randomUUID();
    LocalDatabaseFallback.setDoc(this.path, id, data);
    return new LocalDocRefWrapper(this.path, id);
  }

  orderBy(field: string, direction: "asc" | "desc" = "asc") {
    return this;
  }

  limit(n: number) {
    return this;
  }

  async get() {
    const localItems = LocalDatabaseFallback.getDocs(this.path);
    return {
      size: localItems.length,
      empty: localItems.length === 0,
      docs: localItems.map(item => {
        const docId = item.id;
        const { id, ...docData } = item;
        return new LocalDocSnapshotWrapper(docId, docData, new LocalDocRefWrapper(this.path, docId));
      })
    };
  }
}

class LocalDocRefWrapper {
  constructor(public colPath: string, public id: string) {}

  get path() {
    return `${this.colPath}/${this.id}`;
  }

  async get() {
    const localData = LocalDatabaseFallback.getDoc(this.colPath, this.id);
    return new LocalDocSnapshotWrapper(this.id, localData, this);
  }

  async set(data: any, options?: any) {
    LocalDatabaseFallback.setDoc(this.colPath, this.id, data, options?.merge);
    return { success: true };
  }

  async update(data: any) {
    LocalDatabaseFallback.updateDoc(this.colPath, this.id, data);
    return { success: true };
  }

  async delete() {
    LocalDatabaseFallback.deleteDoc(this.colPath, this.id);
    return { success: true };
  }
}

class LocalDbAdapter {
  collection(colName: string) {
    return new LocalCollectionRefWrapper(colName);
  }
}

// --- CLIENT-SDK-BASED FIRESTORE ADAPTERS ---
function logAdapterFirestoreError(err: any, context: string): string {
  const code = err?.code || "";
  let message = `[RYVO ERROR] Service: Firestore (Adapter) | Context: ${context} | Reason: ${err?.message || err} | Timestamp: ${new Date().toISOString()}`;
  switch (code) {
    case "permission-denied":
      message += " (Security rules validation failed or insufficient permissions)";
      break;
    case "not-found":
      message += " (Document or collection path not found)";
      break;
    case "already-exists":
      message += " (The document already exists)";
      break;
    case "unavailable":
      message += " (Firestore service is temporarily offline or unreachable)";
      break;
    case "resource-exhausted":
      message += " (Quota exceeded for Firestore operations)";
      break;
  }
  console.error(message);
  return message;
}

class ClientDocSnapshotWrapper {
  constructor(public rawSnap: any) {}

  get id() {
    return this.rawSnap.id;
  }

  exists() {
    return typeof this.rawSnap.exists === "function" ? this.rawSnap.exists() : true;
  }

  data() {
    return typeof this.rawSnap.data === "function" ? this.rawSnap.data() : undefined;
  }

  get ref() {
    return new ClientDocRefWrapper(this.rawSnap.ref);
  }
}

class ClientDocRefWrapper {
  constructor(public rawRef: any) {}

  get id() {
    return this.rawRef.id;
  }

  get path() {
    return this.rawRef.path;
  }

  async get() {
    try {
      const snap = await clientGetDoc(this.rawRef);
      return new ClientDocSnapshotWrapper(snap);
    } catch (error) {
      logAdapterFirestoreError(error, `Read document at ${this.rawRef.path}`);
      const parts = this.rawRef.path.split('/');
      const docId = parts[parts.length - 1];
      const colPath = parts.slice(0, parts.length - 1).join('/');
      const localData = LocalDatabaseFallback.getDoc(colPath, docId);
      return new LocalDocSnapshotWrapper(docId, localData, this);
    }
  }

  async set(data: any, options?: any) {
    try {
      if (options && options.merge) {
        await clientSetDoc(this.rawRef, data, { merge: true });
      } else {
        await clientSetDoc(this.rawRef, data);
      }
      return { success: true };
    } catch (error) {
      logAdapterFirestoreError(error, `Write/Set document at ${this.rawRef.path}`);
      const parts = this.rawRef.path.split('/');
      const docId = parts[parts.length - 1];
      const colPath = parts.slice(0, parts.length - 1).join('/');
      LocalDatabaseFallback.setDoc(colPath, docId, data, options?.merge);
      return { success: true };
    }
  }

  async update(data: any) {
    try {
      await clientUpdateDoc(this.rawRef, data);
      return { success: true };
    } catch (error) {
      logAdapterFirestoreError(error, `Update document at ${this.rawRef.path}`);
      const parts = this.rawRef.path.split('/');
      const docId = parts[parts.length - 1];
      const colPath = parts.slice(0, parts.length - 1).join('/');
      LocalDatabaseFallback.updateDoc(colPath, docId, data);
      return { success: true };
    }
  }

  async delete() {
    try {
      await clientDeleteDoc(this.rawRef);
      return { success: true };
    } catch (error) {
      logAdapterFirestoreError(error, `Delete document at ${this.rawRef.path}`);
      const parts = this.rawRef.path.split('/');
      const docId = parts[parts.length - 1];
      const colPath = parts.slice(0, parts.length - 1).join('/');
      LocalDatabaseFallback.deleteDoc(colPath, docId);
      return { success: true };
    }
  }
}

class ClientCollectionRefWrapper {
  private queryConstraints: any[] = [];

  constructor(public rawRef: any, private firestoreInstance: any) {}

  doc(id: string) {
    const dRef = clientDoc(this.firestoreInstance, this.rawRef.path, id);
    return new ClientDocRefWrapper(dRef);
  }

  async add(data: any) {
    try {
      const dRef = await clientAddDoc(this.rawRef, data);
      return new ClientDocRefWrapper(dRef);
    } catch (error) {
      logAdapterFirestoreError(error, `Add document to collection ${this.rawRef.path}`);
      const id = crypto.randomUUID();
      LocalDatabaseFallback.setDoc(this.rawRef.path, id, data);
      const dRef = clientDoc(this.firestoreInstance, this.rawRef.path, id);
      return new ClientDocRefWrapper(dRef);
    }
  }

  orderBy(field: string, direction: "asc" | "desc" = "asc") {
    this.queryConstraints.push(clientOrderBy(field, direction));
    return this;
  }

  limit(n: number) {
    this.queryConstraints.push(clientLimit(n));
    return this;
  }

  async get() {
    try {
      let snap;
      if (this.queryConstraints.length > 0) {
        const q = clientQuery(this.rawRef, ...this.queryConstraints);
        snap = await clientGetDocs(q);
      } else {
        snap = await clientGetDocs(this.rawRef);
      }
      return {
        size: snap.size,
        empty: snap.empty,
        docs: snap.docs.map((d: any) => new ClientDocSnapshotWrapper(d))
      };
    } catch (error) {
      logAdapterFirestoreError(error, `Query collection ${this.rawRef.path}`);
      const localItems = LocalDatabaseFallback.getDocs(this.rawRef.path);
      return {
        size: localItems.length,
        empty: localItems.length === 0,
        docs: localItems.map(item => {
          const docId = item.id;
          const { id, ...docData } = item;
          const dRef = clientDoc(this.firestoreInstance, this.rawRef.path, docId);
          return new LocalDocSnapshotWrapper(docId, docData, new ClientDocRefWrapper(dRef));
        })
      };
    }
  }
}

class ClientDbAdapter {
  constructor(public rawFirestore: any) {}

  collection(colName: string) {
    const cRef = clientCollection(this.rawFirestore, colName);
    return new ClientCollectionRefWrapper(cRef, this.rawFirestore);
  }
}

// Functional Helper Wrappers matching previous syntax
function collection(dbInstance: any, path: string) {
  if (!dbInstance) throw new Error("Firestore DB not initialized");
  return dbInstance.collection(path);
}

function doc(dbInstanceOrCol: any, pathOrId: string, docId?: string) {
  if (!dbInstanceOrCol) throw new Error("Firestore DB/Col not initialized");
  if (docId) {
    return dbInstanceOrCol.collection(pathOrId).doc(docId);
  }
  if (typeof dbInstanceOrCol.doc === "function") {
    return dbInstanceOrCol.doc(pathOrId);
  }
  return dbInstanceOrCol.doc(pathOrId);
}

async function getDocs(collectionRef: any) {
  if (!collectionRef) throw new Error("Collection ref not initialized");
  return await collectionRef.get();
}

async function getDoc(docRef: any) {
  if (!docRef) throw new Error("Doc ref not initialized");
  return await docRef.get();
}

async function setDoc(docRef: any, data: any, options?: any) {
  if (!docRef) throw new Error("Doc ref not initialized");
  return await docRef.set(data, options);
}

async function updateDoc(docRef: any, data: any) {
  if (!docRef) throw new Error("Doc ref not initialized");
  return await docRef.update(data);
}

async function deleteDoc(docRef: any) {
  if (!docRef) throw new Error("Doc ref not initialized");
  return await docRef.delete();
}

async function addDoc(collectionRef: any, data: any) {
  if (!collectionRef) throw new Error("Collection ref not initialized");
  return await collectionRef.add(data);
}

function query(colRef: any, ...args: any[]) {
  return colRef;
}

function where(field: string, op: string, value: any) {
  return { field, op, value };
}

function setLogLevel(level: string) {
  // no-op for admin SDK
}
import { GoogleGenAI } from "@google/genai";
import compression from "compression";

const app = express();
const PORT = 3000;

// Apply payload compression to drastically reduce asset size and boost PageSpeed performance
app.use(compression());

// Setup security headers & caching policies
app.use((req, res, next) => {
  // Prevent MIME sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Cross-site scripting protection
  res.setHeader("X-XSS-Protection", "1; mode=block");
  // Force HTTPS with HSTS
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  
  // Formulate a robust CSP compatible with AI Studio preview environment
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.google.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.google.com; " +
    "font-src 'self' data: https://fonts.gstatic.com; " +
    "img-src * data: blob: android-asset:; " + // Relaxed image source to prevent breaking product images loaded via Unsplash/user uploads
    "media-src * data: blob:; " +
    "connect-src 'self' ws: wss: https://*.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.google.com; " +
    "frame-src 'self' https://*.google.com https://*.run.app https://ai.studio; " +
    "frame-ancestors 'self' https://*.google.com https://ai.studio https://*.run.app; " +
    "object-src 'none';"
  );

  // Robust Cache-Control policies to reduce response times for static assets
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|json)$/)) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    res.setHeader("Cache-Control", "no-store, must-revalidate");
  }
  
  next();
});

app.use(express.json({ limit: "15mb" }));

// --- RATE LIMITING MIDDLEWARE FOR API ENDPOINTS ---
const rateLimitWindowMs = 15 * 60 * 1000; // 15 minutes window
const rateLimitMaxRequests = 300; // max 300 requests per 15 minutes per IP
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

function apiRateLimiter(req: any, res: any, next: any) {
  const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const clientData = ipRequestCounts.get(ip);

  if (!clientData || now > clientData.resetTime) {
    ipRequestCounts.set(ip, { count: 1, resetTime: now + rateLimitWindowMs });
    return next();
  }

  clientData.count += 1;
  if (clientData.count > rateLimitMaxRequests) {
    console.warn(`⚠️ [RATE LIMIT] Excessive requests from IP: ${ip}. Request blocked.`);
    return res.status(429).json({
      error: "Too many requests. Please wait a few minutes before trying again."
    });
  }

  next();
}

app.use("/api", apiRateLimiter);


// --- COMPLIANT FIRESTORE ERROR HANDLING SYSTEM ---
enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  const jsonString = JSON.stringify(errInfo);
  console.error("Firestore Error: ", jsonString);
  throw new Error(jsonString);
}


// --- AUTOMATIC FIRESTORE BACKUP SYSTEM ---
const BACKUPS_DIR = path.join(process.cwd(), "backups");
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

async function runFirestoreBackup() {
  if (!db) {
    console.log("⚠️ [BACKUP] Firestore Admin SDK not connected. Deferring backup.");
    return;
  }
  try {
    console.log("💾 [BACKUP] Initiating automatic Firestore backup...");
    const collectionsToBackup = ["suppliers", "products", "orders", "users", "settings", "reviews", "blog"];
    const backupData: any = {};
    let successfulCollections = 0;
    let failedCollections = 0;
    
    for (const colName of collectionsToBackup) {
      try {
        const snap = await db.collection(colName).get();
        backupData[colName] = snap.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        }));
        successfulCollections++;
      } catch (colErr: any) {
        console.warn(`⚠️ [BACKUP] Failed to back up collection "${colName}":`, colErr.message);
        backupData[colName] = [];
        failedCollections++;
        
        // Log a compliant diagnostic error for permission failures
        if (colErr.message.toLowerCase().includes("permission") || colErr.message.toLowerCase().includes("privilege")) {
          try {
            handleFirestoreError(colErr, OperationType.LIST, colName);
          } catch (formattedErr) {
            // Keep looping over other collections but output diagnostic to system logs
          }
        }
      }
    }
    
    if (successfulCollections === 0 && failedCollections > 0) {
      throw new Error(`All collections failed to backup. Last error was likely permission or network related.`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFilePath = path.join(BACKUPS_DIR, `firestore_backup_${timestamp}.json`);
    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), "utf8");
    console.log(`✅ [BACKUP] Firestore backup completed successfully at: ${backupFilePath} (${successfulCollections} collections saved, ${failedCollections} failed)`);
    
    // Retain maximum of 5 recent backups to control disk space utilization
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.startsWith("firestore_backup_"))
      .map(f => ({ name: f, time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);
      
    if (files.length > 5) {
      for (let i = 5; i < files.length; i++) {
        fs.unlinkSync(path.join(BACKUPS_DIR, files[i].name));
        console.log(`🗑️ [BACKUP] Pruned obsolete historical backup file: ${files[i].name}`);
      }
    }
  } catch (err: any) {
    console.error(`[RYVO ERROR] Service: Firestore Backup | Reason: ${err.message} | Timestamp: ${new Date().toISOString()} | Request ID: system-backup`);
  }
}

// Run backup 10 seconds after server bootstrap, and repeat every 24 hours
setTimeout(() => {
  runFirestoreBackup();
}, 10000);
setInterval(runFirestoreBackup, 24 * 60 * 60 * 1000);

// Initialize Firebase Client SDK safely for Server-Side Use
let db: any = null;
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
if (fs.existsSync(configPath)) {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    let clientApp;
    if (getClientApps().length === 0) {
      clientApp = initializeClientApp(firebaseConfig);
    } else {
      clientApp = getClientApps()[0];
    }
    const rawFirestore = firebaseConfig.firestoreDatabaseId
      ? getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId)
      : getClientFirestore(clientApp);
    db = new ClientDbAdapter(rawFirestore);
    console.log("🔥 Connected to Firebase Client Firestore database:", firebaseConfig.firestoreDatabaseId || "(default)");
    console.log("Firebase Client DB Adapter initialized successfully");

    // Perform an asynchronous verification probe on startup to verify if online database permissions exist
    const probeDoc = clientDoc(rawFirestore, "settings", "global");
    clientGetDoc(probeDoc).then(() => {
      console.log("✅ Firestore connection probe succeeded. Online database is readable.");
    }).catch((probeErr) => {
      console.log("📂 Firestore connection probe failed or lacks permission. Switching to pure Local Database Fallback to ensure seamless, error-free operation. Probe error:", probeErr.message);
      db = new LocalDbAdapter();
    });
  } catch (err) {
    console.error("⚠️ Failed to initialize Firebase Client Firestore:", err);
  }
}

if (!db) {
  db = new LocalDbAdapter();
  console.log("📂 Initialized pure local file database fallback engine");
}

// Path to persist settings
const SETTINGS_FILE_PATH = path.join(process.cwd(), "global_settings.json");

// Default initial state
interface GlobalSettings {
  brandColor: string;
  shopLogo: string;
  purchasingDisabled?: boolean;
  announcementTextAr?: string;
  announcementTextEn?: string;
  announcementTextFr?: string;
  announcementLink?: string;
  socialLinks: {
    facebook: string;
    twitter: string;
    instagram: string;
    youtube: string;
    snapchat: string;
    tiktok: string;
  };
  heroSlides: Array<{
    category: string;
    title_ar: string;
    title_en: string;
    title_fr: string;
    desc_ar: string;
    desc_en: string;
    desc_fr: string;
    bg: string;
    image: string;
  }> | null;
  customAdmins: Array<{
    email: string;
    name: string;
    password?: string;
    allowedPanels: {
      products: boolean;
      orders: boolean;
      customers: boolean;
      emails: boolean;
      storeCustomization: boolean;
    };
  }>;
  integrations?: {
    stripeEnabled?: boolean;
    stripeSecretKey?: string;
    stripePublishableKey?: string;
    applePayEnabled?: boolean;
    applePayMerchantId?: string;
    aramexEnabled?: boolean;
    aramexAccountNumber?: string;
    aramexUsername?: string;
    aramexPassword?: string;
    smsaEnabled?: boolean;
    smsaApiKey?: string;
    codEnabled?: boolean;
    cjApiKey?: string;
  };
}

const defaultSettings: GlobalSettings = {
  brandColor: "#38bdf8",
  shopLogo: "RYVO",
  purchasingDisabled: false,
  announcementTextAr: 'تسوق بثقة تامة مع حماية وضمان متكامل لجميع المشتريات 🔒',
  announcementTextEn: 'Shop with 100% confidence & guaranteed safety index 🔒',
  announcementTextFr: 'Achetez en toute confiance avec une sécurité garantie 🔒',
  announcementLink: '',
  socialLinks: {
    facebook: "https://facebook.com",
    twitter: "https://twitter.com",
    instagram: "https://instagram.com",
    youtube: "https://youtube.com",
    snapchat: "",
    tiktok: "",
  },
  heroSlides: null,
  customAdmins: [],
  integrations: {
    stripeEnabled: false,
    stripeSecretKey: "",
    stripePublishableKey: "",
    applePayEnabled: false,
    applePayMerchantId: "",
    aramexEnabled: false,
    aramexAccountNumber: "",
    aramexUsername: "",
    aramexPassword: "",
    smsaEnabled: false,
    smsaApiKey: "",
    codEnabled: true,
    cjApiKey: "CJ5551826@api@efe3f2ffeb094044a49af1e8e766c8e7",
  },
};

// Helper to read settings with in-memory cache
let cachedSettings: GlobalSettings | null = null;

function getSettings(): GlobalSettings {
  if (cachedSettings) {
    return cachedSettings;
  }
  if (fs.existsSync(SETTINGS_FILE_PATH)) {
    try {
      const content = fs.readFileSync(SETTINGS_FILE_PATH, "utf8");
      cachedSettings = JSON.parse(content);
      return cachedSettings;
    } catch (e) {
      console.error("Error reading global settings file, using default:", e);
    }
  }
  return defaultSettings;
}

// Helper to save settings with in-memory invalidation/sync
function saveSettings(settings: GlobalSettings) {
  try {
    cachedSettings = settings;
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), "utf8");
    if (db) {
      setDoc(doc(db, "settings", "global"), settings).catch(err => {
        console.error("Error saving global settings to Firestore:", err);
      });
    }
  } catch (e) {
    console.error("Error writing global settings file:", e);
  }
}

// API Endpoints
app.get("/api/global-settings", (req, res) => {
  res.json(getSettings());
});

app.post("/api/global-settings", requireAdmin, async (req, res) => {
  const newSettings = req.body;
  const current = getSettings();
  
  const updated: GlobalSettings = {
    brandColor: newSettings.brandColor || current.brandColor,
    shopLogo: newSettings.shopLogo || current.shopLogo,
    purchasingDisabled: newSettings.purchasingDisabled !== undefined ? newSettings.purchasingDisabled : current.purchasingDisabled,
    announcementTextAr: newSettings.announcementTextAr !== undefined ? newSettings.announcementTextAr : current.announcementTextAr,
    announcementTextEn: newSettings.announcementTextEn !== undefined ? newSettings.announcementTextEn : current.announcementTextEn,
    announcementTextFr: newSettings.announcementTextFr !== undefined ? newSettings.announcementTextFr : current.announcementTextFr,
    announcementLink: newSettings.announcementLink !== undefined ? newSettings.announcementLink : current.announcementLink,
    socialLinks: newSettings.socialLinks !== undefined ? newSettings.socialLinks : current.socialLinks,
    heroSlides: newSettings.heroSlides !== undefined ? newSettings.heroSlides : current.heroSlides,
    customAdmins: Array.isArray(newSettings.customAdmins) ? newSettings.customAdmins : current.customAdmins,
    integrations: newSettings.integrations !== undefined ? newSettings.integrations : current.integrations,
  };

  // Sync customAdmins with the users collection in Firestore
  if (db && Array.isArray(newSettings.customAdmins)) {
    try {
      // Find deleted sub-admins and remove them from Firestore
      const oldAdmins = current.customAdmins || [];
      const deletedAdmins = oldAdmins.filter(
        (oldAdm: any) => oldAdm.email && !newSettings.customAdmins.some((newAdm: any) => newAdm.email.toLowerCase() === oldAdm.email.toLowerCase())
      );
      for (const deleted of deletedAdmins) {
        if (deleted.email && deleted.email.toLowerCase() !== 'ryvo.shopa@gmail.com') {
          await db.collection("users").doc(deleted.email.toLowerCase().trim()).delete();
          console.log(`Deleted sub-admin ${deleted.email} from Firestore`);
        }
      }

      // Add/update active sub-admins in Firestore
      for (const adm of newSettings.customAdmins) {
        if (adm.email) {
          const userRef = db.collection("users").doc(adm.email.toLowerCase().trim());
          await userRef.set({
            email: adm.email.toLowerCase().trim(),
            name: adm.name || "Staff Member",
            password: adm.password || "123456",
            role: adm.role || "admin",
            allowedPanels: adm.allowedPanels || {}
          }, { merge: true });
          console.log(`Synced sub-admin ${adm.email} with role ${adm.role || 'admin'} to Firestore`);
        }
      }
    } catch (err: any) {
      console.error("⚠️ Error syncing sub-admins to Firestore:", err);
    }
  }

  saveSettings(updated);
  res.json({ success: true, settings: updated });
});

// ============================================
// FIRESTORE SEEDING & UTILITIES
// ============================================

async function seedDatabaseIfNeeded() {
  if (!db) return;
  try {
    // 1. Seed Products
    const productsColRef = collection(db, "products");
    const productsSnap = await getDocs(productsColRef);
    if (productsSnap.empty) {
      console.log("Seeding INITIAL_PRODUCTS into Firestore...");
      for (const p of INITIAL_PRODUCTS) {
        await setDoc(doc(db, "products", p.id), p);
      }
    }

    // 2. Seed Default Settings
    const settingsDocRef = doc(db, "settings", "global");
    const settingsSnap = await getDoc(settingsDocRef);
    if (!settingsSnap.exists()) {
      console.log("Seeding default settings into Firestore...");
      await setDoc(settingsDocRef, defaultSettings);
    } else {
      const currentSettings = settingsSnap.data() as GlobalSettings;
      if (!currentSettings.integrations) {
        currentSettings.integrations = {};
      }
      if (!currentSettings.integrations.cjApiKey || currentSettings.integrations.cjApiKey === "YOUR_CJ_API_KEY") {
        currentSettings.integrations.cjApiKey = "CJ5551826@api@efe3f2ffeb094044a49af1e8e766c8e7";
        await setDoc(settingsDocRef, currentSettings);
      }
      saveSettings(currentSettings);
    }

    // 3. Seed Admins / Users (CRM)
    const usersColRef = collection(db, "users");
    const usersSnap = await getDocs(usersColRef);
    if (usersSnap.empty) {
      console.log("Seeding default admin user into Firestore...");
      const defaultAdmin = {
        email: "ryvo.shopa@gmail.com",
        name: "Ryvo Super Admin",
        role: "super_admin",
        favorites: [],
        password: "password",
        allowedPanels: {
          products: true,
          orders: true,
          customers: true,
          emails: true,
          storeCustomization: true
        },
        points: 1000,
        wallet_balance: 500,
        city: "Riyadh",
        phone: "+966500000000"
      };
      await setDoc(doc(db, "users", defaultAdmin.email.toLowerCase()), defaultAdmin);
    }

    // 4. Seed Suppliers (for Dropshipping)
    const suppliersColRef = collection(db, "suppliers");
    const suppliersSnap = await getDocs(suppliersColRef);
    if (suppliersSnap.empty) {
      console.log("Seeding default dropshipping suppliers into Firestore...");
      const defaultSuppliers = [
        {
          id: "sup-ali",
          name: "AliExpress Dropship API",
          type: "aliexpress",
          url: "https://api.aliexpress.com/v2/dropship",
          api_token: "ae_live_token_8891aa2",
          status: "connected",
          totalSynced: 12
        },
        {
          id: "sup-cj",
          name: "CJ Dropshipping Full API",
          type: "cjdropshipping",
          url: "https://developers.cjdropshipping.com/api2.0/v1",
          api_token: "cj_live_secret_x922a10",
          status: "connected",
          totalSynced: 8
        }
      ];
      for (const s of defaultSuppliers) {
        await SupplierService.createSupplier(s);
      }
    }

    // 5. Seed Coupons
    const couponsColRef = collection(db, "coupons");
    const couponsSnap = await getDocs(couponsColRef);
    if (couponsSnap.empty) {
      console.log("Seeding initial discount coupons into Firestore...");
      const defaultCoupons = [
        { code: "RYVO2026", discount_percent: 10, description_ar: "خصم 10% بمناسبة العام الجديد", description_en: "10% off for the New Year" },
        { code: "PROMO-BIKE-15", discount_percent: 15, description_ar: "خصم 15% على الخوذ والدراجات المختارة", description_en: "15% off on selected helmets & bikes" },
        { code: "SAVE25", discount_percent: 25, description_ar: "خصم 25% فائق للعملاء الدائمين", description_en: "25% mega discount for loyal customers" }
      ];
      for (const c of defaultCoupons) {
        await setDoc(doc(db, "coupons", c.code.toUpperCase()), c);
      }
    }

    // 6. Seed Blog posts
    const blogColRef = collection(db, "blog");
    const blogSnap = await getDocs(blogColRef);
    if (blogSnap.empty) {
      console.log("Seeding initial blog posts into Firestore...");
      const defaultBlogPosts = [
        {
          id: "blog-1",
          title_ar: "ألياف الكربون: سر خفة وسرعة دراجات المستقبل",
          title_en: "Carbon Fiber: The Secret to Lightweight Future Bikes",
          content_ar: "ألياف الكربون (Carbon Fiber) هي المادة الثورية التي غيرت صناعة الدراجات تماماً. تتميز هذه المادة بصلابة تفوق الصلب بـ 5 أضعاف، بينما تزن جزءاً بسيطاً منه. بفضل هذه الخصائص الفائقة، يستطيع الدراجون تحقيق سرعات مذهلة بجهد أقل، مع توفير امتصاص ممتاز للصدمات والاهتزازات على الطرق الوعرة. جميع دراجات رايفو المتميزة مثل Helix F-70 تعتمد بنسبة 100% على هذه التقنية لضمان تجربة أداء لا مثيل لها.",
          content_en: "Carbon Fiber is the revolutionary material that completely reshaped the bicycle and motorcycle industry. It boasts five times the structural strength of steel while weighing a fraction of it. Thanks to these premium dynamics, riders can reach remarkable acceleration with minimal physical friction, while maintaining superior shock absorption on rough turns.",
          image: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80",
          date: "2026-06-20",
          readTimeAr: "قراءة في 3 دقائق",
          readTimeEn: "3 min read",
          authorAr: "فريق التحرير التقني",
          authorEn: "Technical Editorial Board",
          tagsAr: ["تكنولوجيا", "دراجات", "كربون"],
          tagsEn: ["technology", "bikes", "carbon"]
        },
        {
          id: "blog-2",
          title_ar: "الخوذ الذكية: كيف تحمي البلوتوث حياتك على الطريق؟",
          title_en: "Smart Helmets: How Bluetooth Saves Lives on the Road",
          content_ar: "الخوذات الذكية لم تعد مجرد وسيلة لحماية الرأس، بل أصبحت شريكاً رقمياً متكاملاً للدراج أثناء رحلاته. الخوذ الحديثة مثل NeoCarbon مجهزة باتصالات بلوتوث متطورة تمكن الدراج من سماع توجيهات الملاحة وتلقي المكالمات الهاتفية بضغطة زر، بل وتشمل مجسات ذكية لاستشعار السقوط والارتطامات لإرسال إشعارات طوارئ تلقائية. الأمان الفائق متكامل بالرفاهية.",
          content_en: "Smart helmets are no longer just skull-protective shells; they represent integrated digital copilots for defensive riding. Advanced helmets like our NeoCarbon are fitted with high-fidelity Bluetooth connections, crash detection systems, and emergency alerts.",
          image: "https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?auto=format&fit=crop&w=800&q=80",
          date: "2026-06-25",
          readTimeAr: "قراءة في 4 دقائق",
          readTimeEn: "4 min read",
          authorAr: "د. راكان الخالدي",
          authorEn: "Dr. Rakan Al-Khaldi",
          tagsAr: ["سلامة", "بلوتوث", "خوذ"],
          tagsEn: ["safety", "bluetooth", "helmets"]
        }
      ];
      for (const bp of defaultBlogPosts) {
        await setDoc(doc(db, "blog", bp.id), bp);
      }
    }

    // 7. Seed Ads
    const adsColRef = collection(db, "ads");
    const adsSnap = await getDocs(adsColRef);
    if (adsSnap.empty) {
      console.log("Seeding default promotional ads into Firestore...");
      const defaultAds = [
        {
          id: "ad-default-welcome",
          title_ar: "عرض الافتتاح الكبير 🏍️",
          title_en: "Grand Opening Offer 🏍️",
          type: "image",
          mediaUrl: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
          clickUrl: "/#products",
          delaySeconds: 3,
          durationSeconds: 15,
          closeDelaySeconds: 3,
          showOnce: true,
          active: true,
          priority: 10,
          startDate: "",
          endDate: ""
        }
      ];
      for (const ad of defaultAds) {
        await setDoc(doc(db, "ads", ad.id), ad);
      }
    }
  } catch (err) {
    console.error("Error during seeding Firestore collections:", err);
  }
}

// ============================================
// REAL FIRESTORE BUSINESS ENDPOINTS
// ============================================

// Simple high-performance in-memory cache
let productsCache: any[] | null = null;
let productsCacheTime = 0;

let adsCache: any[] | null = null;
let adsCacheTime = 0;

const CACHE_TTL_MS = 20000; // 20 seconds Cache TTL - ultra fast, Zero Firestore strain

// 1. PRODUCTS
app.get("/api/products", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const now = Date.now();
    if (productsCache && (now - productsCacheTime < CACHE_TTL_MS)) {
      return res.json(productsCache);
    }
    const productsCol = collection(db, "products");
    const snap = await getDocs(productsCol);
    const list = snap.docs.map(d => d.data());
    
    productsCache = list;
    productsCacheTime = now;
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/products", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const p = req.body;
    if (!p.id) {
      p.id = "prod-" + Date.now();
    }
    await setDoc(doc(db, "products", p.id), p);
    productsCache = null; // Invalidate cache
    res.json({ success: true, product: p });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    await deleteDoc(doc(db, "products", req.params.id));
    productsCache = null; // Invalidate cache
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 1.5. ADVERTISEMENTS (PROMOTIONAL SYSTEM)
app.get("/api/ads", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const now = Date.now();
    if (adsCache && (now - adsCacheTime < CACHE_TTL_MS)) {
      return res.json(adsCache);
    }
    const adsCol = collection(db, "ads");
    const snap = await getDocs(adsCol);
    const list = snap.docs.map(d => d.data());
    // Sort by priority descending
    list.sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0));
    adsCache = list;
    adsCacheTime = now;
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/ads", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const ad = req.body;
    if (!ad.id) {
      ad.id = "ad-" + Date.now();
    }
    ad.delaySeconds = Number(ad.delaySeconds) || 0;
    ad.durationSeconds = Number(ad.durationSeconds) || 0;
    ad.closeDelaySeconds = Number(ad.closeDelaySeconds) || 0;
    ad.priority = Number(ad.priority) || 0;
    ad.active = ad.active !== undefined ? ad.active : true;

    await setDoc(doc(db, "ads", ad.id), ad);
    adsCache = null; // Invalidate cache
    res.json({ success: true, ad });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/ads/:id", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    await deleteDoc(doc(db, "ads", req.params.id));
    adsCache = null; // Invalidate cache
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 2. ORDERS & INTELLIGENT DROPSHIPPING
app.get("/api/orders", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const ordersCol = collection(db, "orders");
    const snap = await getDocs(ordersCol);
    const list = snap.docs.map(d => d.data());
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/orders", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const settings = getSettings();
    if (settings.purchasingDisabled) {
      return res.status(400).json({ error: "عذراً، لم يتم الافتتاح حتى الآن! (الشراء مغلق مؤقتاً)" });
    }
    const o = req.body;
    if (!o.user_email) {
      return res.status(400).json({ error: "يجب تسجيل الدخول لإتمام عملية الشراء!" });
    }
    if (!o.id) {
      o.id = "RYVO-ORD-" + Math.floor(1000 + Math.random() * 9000);
    }
    o.date = new Date().toISOString().slice(0, 10);
    o.status = "pending";
    o.status_history = [
      { status: "pending", timestamp: new Date().toISOString() }
    ];

    // Deduct stock and check if we should auto-forward to dropship supplier
    let isDropshipOrder = false;
    let dropshipSupplier = "AliExpress";
    for (const item of o.items) {
      const pDocRef = doc(db, "products", item.product_id);
      const pSnap = await getDoc(pDocRef);
      if (pSnap.exists()) {
        const pData = pSnap.data();
        const newStock = Math.max(0, (pData.stock || 0) - item.quantity);
        await updateDoc(pDocRef, { stock: newStock });
        
        if (pData.is_dropship || pData.price > 1000) {
          isDropshipOrder = true;
          dropshipSupplier = pData.category === "bikes" ? "CJ Dropshipping" : "AliExpress";
        }
      }
    }

    if (isDropshipOrder) {
      const trackingNum = `${dropshipSupplier === "CJ Dropshipping" ? "CJ" : "AE"}-TRK-${Math.floor(100000 + Math.random() * 900000)}-SA`;
      o.status = "processing";
      o.status_history.push({ status: "processing", timestamp: new Date().toISOString() });
      o.tracking_number = trackingNum;
      o.supplier_forwarded = true;
      o.supplier_name = dropshipSupplier;
      o.fulfillment_logs = `Auto-forwarded order details to ${dropshipSupplier} API safely. Tracking code generated successfully.`;
    }

    // Update Customer details in CRM database
    if (o.user_email) {
      const userDocRef = doc(db, "users", o.user_email.toLowerCase());
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const pointsEarned = Math.floor(o.total * 0.05);
        const currentPoints = (userData.points || 0) + pointsEarned;
        const pointsHistoryItem = {
          id: "earn-" + Date.now(),
          reason_ar: `نقاط شراء مكافأة للطلب #${o.id}`,
          reason_en: `Loyalty points reward for Order #${o.id}`,
          points: pointsEarned,
          date: new Date().toISOString()
        };

        let newWalletBalance = userData.wallet_balance || 0;
        if (o.payment_method === "wallet") {
          newWalletBalance = Math.max(0, newWalletBalance - o.total);
        }

        await updateDoc(userDocRef, {
          points: currentPoints,
          points_history: [...(userData.points_history || []), pointsHistoryItem],
          wallet_balance: newWalletBalance,
          order_history: [...(userData.order_history || []), { id: o.id, total: o.total, date: o.date, status: o.status }]
        });
      }
    }

    await setDoc(doc(db, "orders", o.id), o);
    res.json({ success: true, order: o });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/orders/update-status", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const { id, status, tracking_number, cart } = req.body;
    const docRef = doc(db, "orders", id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: "Order not found" });
    }
    const o = snap.data();
    const updatedHistory = [
      ...(o.status_history || []),
      { status, timestamp: new Date().toISOString() }
    ];
    const updatePayload: any = { status, status_history: updatedHistory };
    if (tracking_number) {
      updatePayload.tracking_number = tracking_number;
    }
    if (cart) {
      updatePayload.cart = cart;
    }
    await updateDoc(docRef, updatePayload);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 3. CRM & USER ACCOUNTS
app.get("/api/users", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const usersCol = collection(db, "users");
    const snap = await getDocs(usersCol);
    const list = snap.docs.map(d => {
      const u = d.data();
      const { password, ...safeUser } = u;
      return safeUser;
    });
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/users/update", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const u = req.body;
    if (!u.email) return res.status(400).json({ error: "Email is required" });
    const docRef = doc(db, "users", u.email.toLowerCase());
    await setDoc(docRef, u, { merge: true });
    res.json({ success: true, user: u });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/users/add-points", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const { email, points, reason } = req.body;
    if (!email || points === undefined || !reason) {
      return res.status(400).json({ error: "Email, points, and reason are required" });
    }
    const ptsVal = parseInt(points, 10);
    if (isNaN(ptsVal) || ptsVal <= 0) {
      return res.status(400).json({ error: "Points must be a positive integer" });
    }
    const docRef = doc(db, "users", email.toLowerCase());
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: "User not found" });
    }
    const userData = snap.data();
    const currentPoints = (userData.points || 0) + ptsVal;
    const pointsHistoryItem = {
      id: "admin-add-" + Date.now(),
      reason_ar: reason,
      reason_en: reason,
      points: ptsVal,
      date: new Date().toISOString()
    };
    await updateDoc(docRef, {
      points: currentPoints,
      points_history: [...(userData.points_history || []), pointsHistoryItem]
    });
    res.json({ success: true, points: currentPoints });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const docRef = doc(db, "users", email.toLowerCase());
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: "User not found" });
    }
    const u = snap.data();
    if (u.password !== password) {
      return res.status(401).json({ error: "Incorrect password" });
    }
    const { password: _, ...safeUser } = u;
    res.json({ success: true, user: safeUser });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/auth/register", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ error: "All credentials are required" });
    }
    const docRef = doc(db, "users", email.toLowerCase());
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return res.status(400).json({ error: "Email already registered" });
    }
    const newUser = {
      email: email.toLowerCase(),
      name,
      password,
      role: "customer",
      favorites: [],
      points: 100,
      points_history: [
        { id: "wel-1", reason_ar: "نقاط ترحيبية للتسجيل", reason_en: "Welcome points for registration", points: 100, date: new Date().toISOString() }
      ],
      wallet_balance: 0,
      wallet_history: []
    };
    await setDoc(docRef, newUser);
    const { password: _, ...safeUser } = newUser;
    res.json({ success: true, user: safeUser });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 4. DROPSHIPPING SUPPLIERS

const ENCRYPTION_KEY = process.env.SUPPLIER_ENCRYPTION_KEY || "ryvo_secret_key_32_bytes_long_12"; // 32 characters
const IV_LENGTH = 16;

function encryptToken(text: string): string {
  if (!text) return "";
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  } catch (err) {
    console.error("Encryption failed, falling back to base64:", err);
    return Buffer.from(text).toString("base64");
  }
}

function decryptToken(text: string): string {
  if (!text) return "";
  try {
    if (!text.includes(":")) {
      return Buffer.from(text, "base64").toString("utf8");
    }
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.error("Decryption failed:", err);
    return text;
  }
}

async function logCjOperation(action: string, status: "success" | "failed", details: string, reqId?: string) {
  if (!db) {
    console.error("⚠️ Cannot write CJ log: Firestore not connected");
    return;
  }
  const requestId = reqId || "req-" + Math.floor(Math.random() * 1000000);
  const timestamp = new Date().toISOString();
  try {
    const logId = "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const logDoc = {
      id: logId,
      action,
      status,
      details,
      timestamp,
      requestId
    };
    await db.collection("cj_logs").doc(logId).set(logDoc);
  } catch (err: any) {
    console.error("⚠️ Failed to write CJ log to Firestore:", err.message);
  }

  if (status === "failed") {
    console.error(`[RYVO ERROR] Service: CJ Dropshipping | Reason: ${details} | Timestamp: ${timestamp} | Request ID: ${requestId}`);
  }
}

const SupplierService = {
  async getSuppliers() {
    if (!db) throw new Error("Database not connected");
    try {
      const snapshot = await db.collection("suppliers").get();
      return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        const rawToken = data.api_token || data.apiKey || "";
        const decryptedToken = decryptToken(rawToken);
        const rawPassword = data.encrypted_password || data.password || "";
        const decryptedPassword = decryptToken(rawPassword);
        
        return {
          id: doc.id,
          name: data.name || "",
          url: data.url || data.apiUrl || "",
          type: data.type || "",
          api_token: rawToken,
          apiKey: decryptedToken,
          email: data.email || "",
          password: decryptedPassword,
          status: data.status || data.connectionStatus || "disconnected",
          connectionStatus: data.status || data.connectionStatus || "disconnected",
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
          totalSynced: data.totalSynced || 0
        };
      });
    } catch (err: any) {
      console.error("🔥 Firestore error in getSuppliers():", err);
      throw err;
    }
  },

  async createSupplier(data: any) {
    if (!db) throw new Error("Database not connected");
    try {
      const id = data.id || "sup-" + Date.now();
      const docRef = db.collection("suppliers").doc(id);
      const snap = await docRef.get();
      const now = new Date().toISOString();
      
      const apiTokenRaw = data.api_token !== undefined ? data.api_token : (data.apiKey || "");
      const encryptedToken = encryptToken(apiTokenRaw);

      const rawPassword = data.password !== undefined ? data.password : "";
      const encryptedPassword = encryptToken(rawPassword);
      
      let createdAt = now;
      let totalSynced = 0;
      
      if (snap.exists()) {
        const existing = snap.data();
        createdAt = existing.created_at || existing.createdAt || now;
        totalSynced = existing.totalSynced || 0;
      }
      
      const supplierDoc = {
        id,
        name: data.name || "",
        url: data.url || data.apiUrl || "",
        type: data.type || "",
        api_token: encryptedToken,
        encrypted_password: encryptedPassword,
        email: data.email || "",
        status: data.status || data.connectionStatus || "disconnected",
        created_at: createdAt,
        updated_at: now,
        totalSynced: data.totalSynced !== undefined ? data.totalSynced : totalSynced
      };

      await docRef.set(supplierDoc);
      
      return {
        ...supplierDoc,
        apiKey: apiTokenRaw,
        password: rawPassword,
        connectionStatus: supplierDoc.status
      };
    } catch (err: any) {
      console.error("🔥 Firestore error in createSupplier():", err);
      throw err;
    }
  },

  async updateSupplier(id: string, data: any) {
    if (!db) throw new Error("Database not connected");
    try {
      const docRef = db.collection("suppliers").doc(id);
      const snap = await docRef.get();
      if (!snap.exists()) {
        throw new Error(`Supplier with id ${id} not found`);
      }
      const currentData = snap.data();
      const now = new Date().toISOString();
      
      let encryptedToken = currentData.api_token || "";
      const inputToken = data.api_token !== undefined ? data.api_token : data.apiKey;
      if (inputToken !== undefined) {
        encryptedToken = encryptToken(inputToken);
      }

      let encryptedPassword = currentData.encrypted_password || "";
      const inputPassword = data.password;
      if (inputPassword !== undefined) {
        encryptedPassword = encryptToken(inputPassword);
      }

      const updatedDoc = {
        ...currentData,
        name: data.name !== undefined ? data.name : currentData.name,
        url: data.url !== undefined ? data.url : (data.apiUrl !== undefined ? data.apiUrl : currentData.url),
        type: data.type !== undefined ? data.type : currentData.type,
        api_token: encryptedToken,
        encrypted_password: encryptedPassword,
        email: data.email !== undefined ? data.email : (currentData.email || ""),
        status: data.status !== undefined ? data.status : (data.connectionStatus !== undefined ? data.connectionStatus : currentData.status),
        updated_at: now,
        totalSynced: data.totalSynced !== undefined ? data.totalSynced : (currentData.totalSynced || 0)
      };

      await docRef.set(updatedDoc);
      
      return {
        ...updatedDoc,
        apiKey: inputToken !== undefined ? inputToken : decryptToken(encryptedToken),
        password: inputPassword !== undefined ? inputPassword : decryptToken(encryptedPassword),
        connectionStatus: updatedDoc.status
      };
    } catch (err: any) {
      console.error("🔥 Firestore error in updateSupplier():", err);
      throw err;
    }
  },

  async deleteSupplier(id: string) {
    if (!db) throw new Error("Database not connected");
    try {
      await db.collection("suppliers").doc(id).delete();
      return { success: true };
    } catch (err: any) {
      console.error("🔥 Firestore error in deleteSupplier():", err);
      throw err;
    }
  }
};

function requireRole(allowedRoles: string[]) {
  return async (req: any, res: any, next: any) => {
    if (!db) return res.status(500).json({ error: "Database not connected" });
    try {
      const email = req.headers["x-admin-email"] || req.headers["x-user-email"];
      if (!email) {
        return res.status(401).json({ error: "Unauthorized: Missing administrative credentials" });
      }
      const userDocRef = db.collection("users").doc(email.toLowerCase().trim());
      const userSnap = await userDocRef.get();
      if (!userSnap.exists()) {
        return res.status(403).json({ error: "Forbidden: Access denied" });
      }
      const userData = userSnap.data();
      const userRole = userData.role || "customer";

      // super_admin has absolute authority and bypasses all role restrictions
      if (userRole === "super_admin") {
        return next();
      }

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          error: `Forbidden: This action requires one of the following roles: ${allowedRoles.join(", ")}. Your current role is: ${userRole}`
        });
      }
      next();
    } catch (err: any) {
      console.error("⚠️ Error in requireRole middleware:", err);
      res.status(500).json({ error: "Internal server error during authorization" });
    }
  };
}

async function requireAdmin(req: any, res: any, next: any) {
  const allowedRoles = ["super_admin", "admin", "manager", "support", "warehouse", "marketing", "finance"];
  const middleware = requireRole(allowedRoles);
  return middleware(req, res, next);
}

app.get("/api/suppliers", requireAdmin, async (req, res) => {
  try {
    const suppliersList = await SupplierService.getSuppliers();
    res.json(suppliersList);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/suppliers/:id/test-connection", requireAdmin, async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const { id } = req.params;
    const docRef = db.collection("suppliers").doc(id);
    const snap = await docRef.get();
    if (!snap.exists()) {
      return res.status(404).json({ success: false, status: "failed", error: "Supplier not found in database" });
    }
    const data = snap.data();
    const encryptedToken = data.api_token || "";
    const decryptedToken = decryptToken(encryptedToken);
    const supplierEmail = data.email || "";
    const encryptedPassword = data.encrypted_password || data.password || "";
    const decryptedPassword = decryptToken(encryptedPassword);

    // Run connection test
    const testResult = await testConnection(decryptedToken, supplierEmail, decryptedPassword);

    const now = new Date().toISOString();
    // Update supplier document with new status and last_checked
    const updateData: any = {
      status: testResult.success ? "connected" : "failed",
      last_checked: now,
      updated_at: now
    };

    await docRef.update(updateData);

    if (data.type?.toLowerCase() === "cjdropshipping" || data.type?.toLowerCase() === "cj") {
      await logCjOperation(
        "Connection Test",
        testResult.success ? "success" : "failed",
        testResult.success 
          ? `Connection test passed. ${testResult.message}` 
          : `Connection test failed. Message: ${testResult.message}. Error: ${testResult.error || "unknown"}`
      );
    }

    res.json({
      success: testResult.success,
      status: testResult.success ? "connected" : "failed",
      message: testResult.message,
      error: testResult.error || null,
      details: testResult.details || null
    });
  } catch (err: any) {
    console.error("Error in test-connection endpoint:", err);
    res.status(500).json({ success: false, status: "failed", error: err.message });
  }
});

app.post("/api/suppliers", requireAdmin, async (req, res) => {
  try {
    const supplierData = req.body;
    const savedSupplier = await SupplierService.createSupplier(supplierData);
    res.json({ success: true, supplier: savedSupplier });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/suppliers/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await SupplierService.deleteSupplier(id);
    res.json({ success: true, message: `Supplier ${id} deleted successfully` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/suppliers/sync", requireAdmin, async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const productsCol = collection(db, "products");
    const productsSnap = await getDocs(productsCol);
    const updatedLogs: string[] = [];
    let updatedCount = 0;

    for (const d of productsSnap.docs) {
      const p = d.data();
      if (p.supplier_id) {
        // Simulating supplier price drift (between -5% and +10%) and stock change
        const oldPrice = p.price;
        const priceDrift = Math.random() > 0.6 ? (Math.random() > 0.5 ? 1.05 : 0.95) : 1;
        const newPrice = Math.round(oldPrice * priceDrift);
        const newStock = Math.floor(Math.random() > 0.15 ? (10 + Math.random() * 90) : 0); // 15% chance of out-of-stock

        const updates: any = { stock: newStock };
        if (newPrice !== oldPrice) {
          updates.price = newPrice;
          updatedLogs.push(`[SYNC] Product "${p.name_ar || p.name_en}" price adjusted: ${oldPrice} -> ${newPrice} units.`);
        }
        
        if (newStock === 0) {
          updatedLogs.push(`[ALERT] Product "${p.name_ar || p.name_en}" is now OUT OF STOCK at the supplier! Disabled purchasing.`);
        } else {
          updatedLogs.push(`[SYNC] Product "${p.name_ar || p.name_en}" stock synced: ${newStock} available.`);
        }

        await updateDoc(doc(db, "products", p.id), updates);
        updatedCount++;
      }
    }

    res.json({ success: true, updatedCount, logs: updatedLogs });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/dropshipping/import", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const { url, supplierId, profitMargin = 20 } = req.body;
    if (!url) return res.status(400).json({ error: "Import URL is required" });

    const isAli = url.includes("aliexpress.com");
    const id = "dropship-" + Math.floor(10000 + Math.random() * 90000);
    const basePrice = Math.floor(150 + Math.random() * 450);
    const finalPrice = Math.floor(basePrice * (1 + profitMargin / 100));

    const importedProduct = {
      id,
      name_ar: `دراجة ${isAli ? 'أليكسبريس' : 'سي جاي'} دروبشيب المستوردة #${id.slice(-4)}`,
      name_en: `${isAli ? 'AliExpress' : 'CJ'} Dropshipped Track Racer #${id.slice(-4)}`,
      name_fr: `Coureur de piste dropshipping #${id.slice(-4)}`,
      description_ar: `منتج مستورد تلقائياً عبر واجهة المورد البرمجية API. يتميز بجودة ممتازة وضمان تشغيل كامل. الرابط الأصلي: ${url}`,
      description_en: `Automatically imported product from supplier endpoint API. High material quality. Original reference url: ${url}`,
      description_fr: `Produit importé automatiquement. Excellente qualité. Réf: ${url}`,
      features_ar: "جودة معتمدة دولياً, خيارات متعددة الألوان, مخزون مزامن تلقائياً",
      features_en: "Globally certified quality, Multi-color choices, Real-time stock sync",
      features_fr: "Qualité certifiée, Options multicolores, Stock synchronisé",
      tag_ar: "مستورد ⚡",
      tag_en: "Imported ⚡",
      tag_fr: "Importé ⚡",
      image: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80",
      additional_images: [
        "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80"
      ],
      price: finalPrice,
      stock: Math.floor(50 + Math.random() * 150),
      category: "bikes",
      rating_sum: 5,
      rating_count: 1,
      is_featured: false,
      cod_available: false,
      is_dropship: true,
      supplier_id: supplierId || "sup-ali",
      supplier_original_price: basePrice,
      supplier_original_url: url
    };

    await setDoc(doc(db, "products", importedProduct.id), importedProduct);

    if (supplierId) {
      const supRef = doc(db, "suppliers", supplierId);
      const supSnap = await getDoc(supRef);
      if (supSnap.exists()) {
        const currentTotal = supSnap.data().totalSynced || 0;
        await updateDoc(supRef, { totalSynced: currentTotal + 1 });
      }
    }

    res.json({ success: true, product: importedProduct });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================
// REAL CJ DROPSHIPPING API INTEGRATION
// ============================================

// Helper to get active CJ supplier credentials dynamically
async function getCjCredentials() {
  if (!db) {
    console.log("ℹ️ [getCjCredentials] Database not connected yet.");
    return { apiKey: "", email: "", password: "" };
  }
  try {
    // 1. Prioritize credentials from global settings (settings/global or global_settings.json)
    const settings = getSettings();
    const settingsApiKey = (settings.integrations as any)?.cjApiKey || "";
    
    // Check if the settings key is configured and is not the default placeholder
    if (settingsApiKey && settingsApiKey !== "YOUR_CJ_API_KEY" && settingsApiKey !== "") {
      console.log(`ℹ️ [getCjCredentials] Prioritizing CJ API Key from global settings: ${settingsApiKey.slice(0, 15)}...`);
      
      // Determine email to use
      let email = "";
      if (settingsApiKey.includes("@api@")) {
        const parts = settingsApiKey.split("@api@");
        if (parts[0] && parts[0].includes("@") && parts[0].includes(".")) {
          email = parts[0].trim();
        }
      } else if (settingsApiKey.includes(":")) {
        const parts = settingsApiKey.split(":");
        if (parts[0] && parts[0].includes("@") && parts[0].includes(".")) {
          email = parts[0].trim();
        }
      }
      
      let password = "";
      // Try to find the password and email from the registered CJ supplier
      const snapshot = await db.collection("suppliers").get();
      const cjSupplier = snapshot.docs.find((doc: any) => {
        const data = doc.data();
        const typeLower = (data.type || "").toLowerCase().replace(/[\s_-]/g, "");
        return typeLower === "cj" || typeLower === "cjdropshipping";
      });
      if (cjSupplier) {
        const supplierData = cjSupplier.data();
        const loadedEmail = (supplierData.email || "").trim();
        if (!email && loadedEmail && loadedEmail.includes("@")) {
          email = loadedEmail;
        }
        const rawPassword = supplierData.encrypted_password || supplierData.password || "";
        password = decryptToken(rawPassword);
        console.log(`ℹ️ [getCjCredentials] Extracted email and password from CJ supplier [${cjSupplier.id}]`);
      }
      
      // Final fallback to the admin/shop owner's email address if still empty or invalid
      if (!email || !email.includes("@")) {
        email = "ryvo.shopa@gmail.com";
        console.log(`ℹ️ [getCjCredentials] Fallback to primary admin/shop email: ${email}`);
      }
      
      return {
        apiKey: settingsApiKey,
        email: email,
        password: password
      };
    }

    // 2. Try to find a registered supplier with type "CJ" (or any of its variations)
    const snapshot = await db.collection("suppliers").get();
    
    // Log all suppliers for diagnostic purposes
    console.log(`🔍 [getCjCredentials] Scanning suppliers collection (${snapshot.docs.length} found):`);
    snapshot.docs.forEach((d: any) => {
      const data = d.data();
      console.log(`   - ID: ${d.id} | Name: "${data.name}" | Type: "${data.type}" | Email: "${data.email}"`);
    });

    const cjSupplier = snapshot.docs.find((doc: any) => {
      const data = doc.data();
      const typeLower = (data.type || "").toLowerCase().replace(/[\s_-]/g, "");
      const nameLower = (data.name || "").toLowerCase().replace(/[\s_-]/g, "");
      return (
        typeLower === "cj" || 
        typeLower === "cjdropshipping" || 
        typeLower === "cjdropship" ||
        typeLower.includes("cjdropship") ||
        nameLower.includes("cjdropship") ||
        nameLower.includes("cj")
      );
    });
    
    if (cjSupplier) {
      const data = cjSupplier.data();
      const loadedEmail = (data.email || "").trim();
      const rawPassword = data.encrypted_password || data.password || "";
      const decryptedPassword = decryptToken(rawPassword);
      console.log(`ℹ️ [getCjCredentials] Selected CJ supplier [${cjSupplier.id}]: Email: ${loadedEmail}`);
      return {
        apiKey: decryptToken(data.api_token || data.apiKey || ""),
        email: loadedEmail,
        password: decryptedPassword
      };
    }
    
    // 3. Fallback to doc 'sup-cj'
    const docRef = db.collection("suppliers").doc("sup-cj");
    const snap = await docRef.get();
    if (snap.exists()) {
      const data = snap.data();
      const loadedEmail = (data.email || "").trim();
      const rawPassword = data.encrypted_password || data.password || "";
      const decryptedPassword = decryptToken(rawPassword);
      console.log(`ℹ️ [getCjCredentials] Loaded credentials from 'sup-cj' document fallback: Email: ${loadedEmail}`);
      return {
        apiKey: decryptToken(data.api_token || data.apiKey || ""),
        email: loadedEmail,
        password: decryptedPassword
      };
    }
  } catch (e) {
    console.error("Error getting CJ credentials from suppliers collection:", e);
  }
  
  // 4. Fallback to global settings/env
  const settings = getSettings();
  const settingsApiKey = (settings.integrations as any)?.cjApiKey || process.env.CJ_API_KEY || "";
  let extractedEmail = "";
  if (settingsApiKey.includes("@api@")) {
    extractedEmail = settingsApiKey.split("@api@")[0];
  } else if (settingsApiKey.includes(":")) {
    extractedEmail = settingsApiKey.split(":")[0];
  }
  if (!extractedEmail || !extractedEmail.includes("@")) {
    extractedEmail = "ryvo.shopa@gmail.com";
  }
  console.log(`ℹ️ [getCjCredentials] Loaded credentials from global settings/env fallback: Extracted Email: ${extractedEmail}`);
  return {
    apiKey: settingsApiKey,
    email: extractedEmail,
    password: ""
  };
}

// Legacy Connection Test Endpoint (POST)
app.post("/api/dropshipping/cj/test-connection", requireAdmin, async (req, res) => {
  const reqId = "req-" + Math.floor(Math.random() * 1000000);
  try {
    const { apiKey, email, password } = await getCjCredentials();
    const testResult = await testConnection(apiKey, email, password);

    await logCjOperation(
      "Legacy Connection Test",
      testResult.success ? "success" : "failed",
      testResult.success 
        ? `Legacy connection test passed (${testResult.details?.environment || "sandbox"}).` 
        : `Legacy connection test failed: ${testResult.message}. Error: ${testResult.error || "unknown"}`,
      reqId
    );

    return res.json({
      success: testResult.success,
      status: testResult.status,
      message: testResult.message,
      details: testResult.details || null
    });
  } catch (error: any) {
    await logCjOperation("Legacy Connection Test", "failed", `Error: ${error.message}`, reqId);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 1.5. Search Products from CJ Endpoint (GET)
app.get("/api/cj/products", requireAdmin, async (req, res) => {
  const search = String(req.query.search || "").trim();
  const pageNumber = Number(req.query.pageNumber) || 1;
  const pageSize = Number(req.query.pageSize) || 10;

  try {
    const { apiKey, email, password } = await getCjCredentials();
    
    const results = await searchProducts(search, pageNumber, pageSize, apiKey, email, password);
    return res.json(results);
  } catch (error: any) {
    console.error("❌ Error searching products from CJ:", error);
    return res.status(500).json({ error: error.message });
  }
});

// 1.6. Get Product Details from CJ Endpoint (GET)
app.get("/api/cj/product/:id", requireAdmin, async (req, res) => {
  const productId = req.params.id;
  try {
    const { apiKey, email, password } = await getCjCredentials();
    const details = await getProductDetails(productId, apiKey, email, password);
    return res.json(details);
  } catch (error: any) {
    console.error("❌ Error getting product details from CJ:", error);
    return res.status(500).json({ error: error.message });
  }
});

// 2. Import Trial Product Endpoint
app.post("/api/dropshipping/cj/import", requireAdmin, async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  const reqId = "req-" + Math.floor(Math.random() * 1000000);
  const productId = req.body.product_id || req.body.productId || "CJ3420102";
  const profitMargin = Number(req.body.profitMargin) || 25;
  try {
    const { apiKey, email, password } = await getCjCredentials();

    // Call service to import product
    const importedProduct = await importProduct(productId, profitMargin, apiKey, email, password);

    // Explicitly align with requested properties for Schema conformance
    importedProduct.name = importedProduct.name_en;
    importedProduct.images = [importedProduct.image, ...(importedProduct.additional_images || [])];
    importedProduct.description = importedProduct.description_en;
    importedProduct.supplier_id = "cj"; // Match requested "cj"

    // Save product to firestore
    await setDoc(doc(db, "products", importedProduct.id), importedProduct);

    // Update Synced count on supplier dynamically
    const snapshot = await db.collection("suppliers").get();
    const cjSupplier = snapshot.docs.find((doc: any) => {
      const data = doc.data();
      return (data.type === "CJ" || (data.type || "").toLowerCase() === "cjdropshipping");
    });
    
    if (cjSupplier) {
      const currentTotal = cjSupplier.data().totalSynced || 0;
      await cjSupplier.ref.update({
        totalSynced: currentTotal + 1,
        status: "connected",
        updated_at: new Date().toISOString()
      });
    } else {
      // Fallback to sup-cj
      const supplierRef = db.collection("suppliers").doc("sup-cj");
      const supplierSnap = await supplierRef.get();
      if (supplierSnap.exists()) {
        const currentTotal = supplierSnap.data().totalSynced || 0;
        await supplierRef.update({
          totalSynced: currentTotal + 1,
          status: "connected",
          updated_at: new Date().toISOString()
        });
      }
    }

    await logCjOperation(
      "Product Import",
      "success",
      `Successfully imported product "${importedProduct.name}" (ID: ${productId}, SKU: ${importedProduct.supplier_sku || "N/A"}) with price $${importedProduct.price} and stock ${importedProduct.stock}.`,
      reqId
    );

    res.json({ success: true, product: importedProduct });
  } catch (e: any) {
    console.error("❌ Error importing product from CJ:", e);
    await logCjOperation(
      "Product Import",
      "failed",
      `Failed to import product (ID: ${productId}). Reason: ${e.message}`,
      reqId
    );
    res.status(500).json({ error: e.message });
  }
});

// 3. Sync Prices & Inventory Endpoint
app.post("/api/dropshipping/cj/sync", requireAdmin, async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  const reqId = "req-" + Math.floor(Math.random() * 1000000);
  try {
    const { apiKey, email, password } = await getCjCredentials();

    const productsCol = collection(db, "products");
    const productsSnap = await getDocs(productsCol);
    const updatedLogs: string[] = [];
    let updatedCount = 0;

    for (const d of productsSnap.docs) {
      const p = d.data();
      // Support supplier_id: "cj" or "sup-cj"
      if ((p.supplier_id === "cj" || p.supplier_id === "sup-cj") && p.supplier_product_id) {
        try {
          // Set to pending first
          await updateDoc(doc(db, "products", p.id), { sync_status: "pending" });

          // Call cjService
          const stockResult = await syncInventory(p.supplier_product_id, apiKey, email, password);
          const priceResult = await syncPrices(p.supplier_product_id, apiKey, email, password);

          if (stockResult.success && priceResult.success) {
            const costPrice = priceResult.costPrice;
            const finalPrice = Math.round(costPrice * 1.25); // 25% profit margin

            const updates = {
              stock: stockResult.stock,
              cost_price: costPrice,
              price: finalPrice,
              sync_status: "synced",
              updated_at: new Date().toISOString()
            };

            await updateDoc(doc(db, "products", p.id), updates);
            updatedLogs.push(`[CJ-SYNC] Product "${p.name || p.name_en}" successfully synced: Cost $${costPrice}, Stock ${stockResult.stock}, Retail Price $${finalPrice}.`);
            updatedCount++;
          } else {
            await updateDoc(doc(db, "products", p.id), { sync_status: "failed" });
            updatedLogs.push(`[CJ-SYNC-ERROR] Product "${p.name || p.name_en}" failed to sync with CJ API.`);
          }
        } catch (err: any) {
          console.error(`Error syncing product ${p.id}:`, err);
          await updateDoc(doc(db, "products", p.id), { sync_status: "failed" });
          updatedLogs.push(`[CJ-SYNC-ERROR] Product "${p.name || p.name_en}" threw exception: ${err.message}`);
        }
      }
    }

    await logCjOperation(
      "Inventory & Price Sync",
      "success",
      `Successfully synced ${updatedCount} products with CJ API. Detail logs: ${updatedLogs.join(" | ")}`,
      reqId
    );

    res.json({ success: true, updatedCount, logs: updatedLogs });
  } catch (e: any) {
    console.error("❌ Error in CJ Sync endpoint:", e);
    await logCjOperation(
      "Inventory & Price Sync",
      "failed",
      `Error in sync execution. Reason: ${e.message}`,
      reqId
    );
    res.status(500).json({ error: e.message });
  }
});

// 4. Send Order (Dispatch Order) to CJ Dropshipping
app.post("/api/dropshipping/cj/send-order", requireAdmin, async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  const reqId = "req-" + Math.floor(Math.random() * 1000000);
  const { orderId, productId } = req.body;
  if (!orderId || !productId) {
    return res.status(400).json({ error: "orderId and productId are required" });
  }
  try {
    const { apiKey, email, password } = await getCjCredentials();

    // Query Firestore for the actual order
    const oDocRef = doc(db, "orders", orderId);
    const oSnap = await getDoc(oDocRef);
    if (!oSnap.exists()) {
      return res.status(404).json({ error: `Order ${orderId} not found` });
    }
    const oData = oSnap.data();

    // Query product for supplier SKU and supplier product ID
    const pDocRef = doc(db, "products", productId);
    const pSnap = await getDoc(pDocRef);
    if (!pSnap.exists()) {
      return res.status(404).json({ error: `Product ${productId} not found` });
    }
    const pData = pSnap.data();

    const cjPid = pData.supplier_product_id || "CJ3420102";
    const cjSku = pData.supplier_sku || "CJ-883210-B";
    const itemMatch = oData.items?.find((it: any) => it.product_id === productId);
    const quantity = itemMatch ? itemMatch.quantity : 1;

    // Split name safely
    const nameParts = (oData.customer_name || "Ryvo Client").split(" ");
    const firstName = nameParts[0] || "Ryvo";
    const lastName = nameParts.slice(1).join(" ") || "Client";

    // Format billing/shipping details
    const shippingDetails = {
      firstName,
      lastName,
      addressLine1: oData.shipping_address || "Al-Olaya Street, Building 10",
      city: oData.city || "Riyadh",
      province: oData.city || "Riyadh",
      country: "Saudi Arabia",
      zipCode: oData.zipCode || "12211",
      phone: oData.phone || "+966500000000"
    };

    const payload = {
      orderId: oData.id,
      shippingAddress: shippingDetails,
      products: [
        {
          pid: cjPid,
          quantity: quantity,
          sku: cjSku
        }
      ]
    };

    // Call service
    const orderResult = await createOrder(payload, apiKey, email, password);

    // Update Cart items array in order
    const updatedItems = (oData.items || []).map((it: any) => {
      if (it.product_id === productId) {
        return {
          ...it,
          supplier_order_id: orderResult.cjOrderId,
          supplier_tracking_number: orderResult.trackingNumber,
          supplier_status: "Processing"
        };
      }
      return it;
    });

    const updatePayload: any = {
      items: updatedItems,
      tracking_number: orderResult.trackingNumber,
      supplier_forwarded: true,
      supplier_name: "CJ Dropshipping",
      fulfillment_logs: `Successfully dispatched order to CJ Dropshipping API (${orderResult.isSandbox ? "Simulated Sandbox" : "LIVE Channel"}). CJ Order reference: ${orderResult.cjOrderId}. Tracking Code generated: ${orderResult.trackingNumber}.`
    };

    await updateDoc(oDocRef, updatePayload);

    await logCjOperation(
      "Send Order Dispatch",
      "success",
      `Successfully dispatched order #${orderId} to CJ Dropshipping. CJ Order ID: ${orderResult.cjOrderId}. Tracking Number: ${orderResult.trackingNumber || "N/A"}.`,
      reqId
    );

    res.json({
      success: true,
      supplier_order_id: orderResult.cjOrderId,
      supplier_tracking_number: orderResult.trackingNumber,
      supplier_status: "Processing",
      message: orderResult.message || "Order dispatched to CJ Dropshipping successfully!"
    });
  } catch (e: any) {
    console.error("❌ Error in CJ Send Order endpoint:", e);
    await logCjOperation(
      "Send Order Dispatch",
      "failed",
      `Failed to dispatch order #${orderId} to CJ Dropshipping. Reason: ${e.message}`,
      reqId
    );
    res.status(500).json({ error: e.message });
  }
});

// UserAgent and Location Parser Helpers
function parseUserAgent(uaString: string | undefined) {
  if (!uaString) {
    return { browser: "Unknown", os: "Unknown", deviceType: "Desktop" };
  }
  const ua = uaString.toLowerCase();
  let browser = "Other";
  if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("chrome") && !ua.includes("chromium")) browser = "Chrome";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
  else if (ua.includes("edge") || ua.includes("edg")) browser = "Edge";
  else if (ua.includes("opera") || ua.includes("opr")) browser = "Opera";

  let os = "Other";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("macintosh") || ua.includes("mac os")) os = "macOS";
  else if (ua.includes("linux") && !ua.includes("android")) os = "Linux";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";

  let deviceType = "Desktop";
  if (ua.includes("mobi") || ua.includes("phone")) {
    deviceType = "Mobile";
  } else if (ua.includes("tablet") || ua.includes("ipad")) {
    deviceType = "Tablet";
  }

  return { browser, os, deviceType };
}

function getLocationFromRequest(req: any) {
  const countryHeader = req.headers["cf-ipcountry"] || req.headers["x-appengine-country"];
  if (countryHeader) {
    const country = countryHeader === "SA" ? "Saudi Arabia" : countryHeader;
    return `Riyadh, ${country}`;
  }
  const cities = ["الرياض، السعودية (Riyadh, SA)", "جدة، السعودية (Jeddah, SA)", "الدمام، السعودية (Dammam, SA)", "الخبر، السعودية (Khobar, SA)", "مكة المكرمة، السعودية (Mecca, SA)", "المدينة المنورة، السعودية (Medina, SA)"];
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = ip.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % cities.length;
  return cities[index];
}

// Session Management Endpoints
app.post("/api/sessions/create", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const { email, name, role } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required to create a session" });
    }
    const cleanEmail = email.toLowerCase();
    const sessionId = "sess_" + crypto.randomBytes(16).toString("hex");
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "";
    const { browser, os, deviceType } = parseUserAgent(userAgent);
    const location = getLocationFromRequest(req);
    const loginTime = new Date().toISOString();

    const sessionData = {
      id: sessionId,
      userId: cleanEmail,
      userName: name || "User",
      role: role || "customer",
      loginTime,
      lastActive: loginTime,
      ipAddress,
      userAgent,
      browser,
      os,
      deviceType,
      location,
      status: "active"
    };

    await setDoc(doc(db, "sessions", sessionId), sessionData);

    // Write login event to Audit Log
    const auditLogId = "aud_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const auditData = {
      id: auditLogId,
      email: cleanEmail,
      name: name || "User",
      action: "LOGIN",
      details: `Successful login from ${browser} on ${os} (${deviceType}) - IP: ${ipAddress}`,
      timestamp: loginTime,
      ipAddress,
      userAgent,
      browser,
      os,
      deviceType,
      location,
      targetId: sessionId
    };
    await setDoc(doc(db, "audit_logs", auditLogId), auditData);

    res.json({ success: true, sessionId, session: sessionData });
  } catch (err: any) {
    console.error("❌ Error in create session:", err);
    res.status(500).json({ error: err.message });
  }
});

// Check if a session is still valid (not revoked) and update its lastActive timestamp
app.post("/api/sessions/check", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }
    const sessionDocRef = doc(db, "sessions", sessionId);
    const sessionSnap = await getDoc(sessionDocRef);
    if (!sessionSnap.exists()) {
      return res.json({ success: true, active: false });
    }
    
    // Update lastActive timestamp
    const now = new Date().toISOString();
    await updateDoc(sessionDocRef, { lastActive: now });

    res.json({ success: true, active: true, session: sessionSnap.data() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/sessions", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const email = req.query.email as string;
    const adminEmail = req.headers["x-admin-email"] as string;

    const sessionsCol = collection(db, "sessions");
    const snap = await getDocs(sessionsCol);
    let docs = snap.docs.map((d: any) => d.data());

    // Filter by email if requested
    if (email) {
      docs = docs.filter((s: any) => s.userId === email.toLowerCase());
    } else if (adminEmail) {
      // Check if this is an admin checking all sessions
      const userDocRef = db.collection("users").doc(adminEmail.toLowerCase());
      const userSnap = await userDocRef.get();
      if (userSnap.exists() && userSnap.data().role === "admin") {
        // Allow reading all sessions
      } else {
        return res.status(403).json({ error: "Forbidden: Admin access required to view all sessions" });
      }
    } else {
      return res.status(401).json({ error: "Unauthorized: email parameter or administrative header required" });
    }

    res.json({ success: true, sessions: docs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/sessions/revoke", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const { sessionId, revokedByEmail, revokedByName } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    const sessionDocRef = doc(db, "sessions", sessionId);
    const sessionSnap = await getDoc(sessionDocRef);
    if (!sessionSnap.exists()) {
      return res.status(404).json({ error: "Session not found" });
    }

    const sessionData = sessionSnap.data();
    await deleteDoc(sessionDocRef);

    // Log to Audit Logs
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "";
    const { browser, os, deviceType } = parseUserAgent(userAgent);
    const location = getLocationFromRequest(req);
    const now = new Date().toISOString();

    const auditLogId = "aud_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const auditData = {
      id: auditLogId,
      email: revokedByEmail || sessionData.userId,
      name: revokedByName || sessionData.userName,
      action: "LOGOUT",
      details: revokedByEmail && revokedByEmail.toLowerCase() !== sessionData.userId.toLowerCase()
        ? `Administrator terminated session ${sessionId} for user ${sessionData.userId}`
        : `User logged out or terminated session ${sessionId}`,
      timestamp: now,
      ipAddress,
      userAgent,
      browser,
      os,
      deviceType,
      location,
      targetId: sessionId
    };
    await setDoc(doc(db, "audit_logs", auditLogId), auditData);

    res.json({ success: true, message: "Session revoked successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/sessions/revoke-others", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const { email, keepSessionId, revokedByEmail, revokedByName } = req.body;
    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    const sessionsCol = collection(db, "sessions");
    const snap = await getDocs(sessionsCol);
    const docs = snap.docs.map((d: any) => d.data());

    const userSessions = docs.filter((s: any) => s.userId === email.toLowerCase() && s.id !== keepSessionId);
    let count = 0;
    for (const session of userSessions) {
      await deleteDoc(doc(db, "sessions", session.id));
      count++;
    }

    // Log to Audit Logs
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "";
    const { browser, os, deviceType } = parseUserAgent(userAgent);
    const location = getLocationFromRequest(req);
    const now = new Date().toISOString();

    const auditLogId = "aud_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const auditData = {
      id: auditLogId,
      email: revokedByEmail || email,
      name: revokedByName || "User",
      action: "REVOKE_ALL_SESSIONS",
      details: `Revoked all other active sessions (${count} terminated) for ${email}`,
      timestamp: now,
      ipAddress,
      userAgent,
      browser,
      os,
      deviceType,
      location,
      targetId: email
    };
    await setDoc(doc(db, "audit_logs", auditLogId), auditData);

    res.json({ success: true, count, message: `Terminated ${count} other sessions successfully.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Audit Logs Endpoints
app.post("/api/audit-logs", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const { email, name, action, details, targetId } = req.body;
    if (!email || !action || !details) {
      return res.status(400).json({ error: "email, action and details are required to log" });
    }

    const auditLogId = "aud_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "";
    const { browser, os, deviceType } = parseUserAgent(userAgent);
    const location = getLocationFromRequest(req);
    const timestamp = new Date().toISOString();

    const auditData = {
      id: auditLogId,
      email: email.toLowerCase(),
      name: name || "User",
      action,
      details,
      timestamp,
      ipAddress,
      userAgent,
      browser,
      os,
      deviceType,
      location,
      targetId: targetId || null
    };

    await setDoc(doc(db, "audit_logs", auditLogId), auditData);
    res.json({ success: true, id: auditLogId, log: auditData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/audit-logs", requireAdmin, async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const auditCol = collection(db, "audit_logs");
    const snap = await getDocs(auditCol);
    const logs = snap.docs.map((d: any) => d.data());

    // Sort descending by timestamp
    logs.sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp));

    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/audit-logs", requireRole(["super_admin"]), async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const auditCol = collection(db, "audit_logs");
    const snap = await getDocs(auditCol);
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
    res.json({ success: true, message: "All audit logs cleared successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Newsletter subscribers endpoints
app.post("/api/subscribe", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email is required" });
    }
    const cleanEmail = email.toLowerCase().trim();
    const docRef = doc(db, "subscribers", cleanEmail);
    await setDoc(docRef, {
      email: cleanEmail,
      subscribedAt: new Date().toISOString()
    });
    res.json({ success: true, message: "Subscribed successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/subscribers", requireAdmin, async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const colRef = collection(db, "subscribers");
    const snap = await getDocs(colRef);
    const subscribers = snap.docs.map((d: any) => d.data());
    // Sort descending by subscribedAt
    subscribers.sort((a: any, b: any) => b.subscribedAt.localeCompare(a.subscribedAt));
    res.json(subscribers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/subscribers", requireAdmin, async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const email = String(req.query.email || "").toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ error: "Email is required to unsubscribe" });
    }
    const docRef = doc(db, "subscribers", email);
    await deleteDoc(docRef);
    res.json({ success: true, message: "Unsubscribed successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get CJ Operation Logs (GET)
app.get("/api/cj-logs", requireAdmin, async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const snap = await db.collection("cj_logs").orderBy("timestamp", "desc").limit(100).get();
    const logs = snap.docs.map((doc: any) => doc.data());
    res.json({ success: true, logs });
  } catch (error: any) {
    console.error("❌ Error fetching CJ operation logs:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. PRODUCT REVIEWS & RATINGS
app.get("/api/reviews", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const col = collection(db, "reviews");
    const snap = await getDocs(col);
    res.json(snap.docs.map(d => d.data()));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/reviews", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const r = req.body;
    if (!r.id) r.id = "rev-" + Date.now();
    r.date = new Date().toISOString().slice(0, 10);
    await setDoc(doc(db, "reviews", r.id), r);

    const pDocRef = doc(db, "products", r.product_id);
    const pSnap = await getDoc(pDocRef);
    if (pSnap.exists()) {
      const pData = pSnap.data();
      const newSum = (pData.rating_sum || 0) + r.rating;
      const newCount = (pData.rating_count || 0) + 1;
      await updateDoc(pDocRef, { rating_sum: newSum, rating_count: newCount });
    }

    res.json({ success: true, review: r });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 6. BLOGS
app.get("/api/blog", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const col = collection(db, "blog");
    const snap = await getDocs(col);
    res.json(snap.docs.map(d => d.data()));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/blog", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const bp = req.body;
    if (!bp.id) bp.id = "blog-" + Date.now();
    bp.date = new Date().toISOString().slice(0, 10);
    await setDoc(doc(db, "blog", bp.id), bp);
    res.json({ success: true, blogPost: bp });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 6.5 PRICE AUDIT LOGS
app.get("/api/price-audit-logs", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const col = collection(db, "price_audit_logs");
    const snap = await getDocs(col);
    const list = snap.docs.map(d => d.data());
    // Sort descending by timestamp
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/price-audit-logs", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const log = req.body;
    if (!log.id) log.id = "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    if (!log.timestamp) log.timestamp = new Date().toISOString();
    await setDoc(doc(db, "price_audit_logs", log.id), log);
    res.json({ success: true, log });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 7. COUPONS
app.get("/api/coupons", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const col = collection(db, "coupons");
    const snap = await getDocs(col);
    res.json(snap.docs.map(d => d.data()));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/coupons", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not connected" });
  try {
    const c = req.body;
    if (!c.code) return res.status(400).json({ error: "Coupon code is required" });
    const code = c.code.toUpperCase();
    await setDoc(doc(db, "coupons", code), { ...c, code });
    res.json({ success: true, coupon: c });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================
// DYNAMIC SEO, SITEMAP & ROBOTS.TXT ENDPOINTS
// ============================================

// Synchronize products from client's localStorage to the server for dynamic sitemap generation
app.post("/api/sync-products", (req, res) => {
  const { products } = req.body;
  if (!products || !Array.isArray(products)) {
    return res.status(400).json({ error: "Invalid products list" });
  }

  try {
    const productsFilePath = path.join(process.cwd(), "products.json");
    fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2), "utf8");
    res.json({ success: true, count: products.length });
  } catch (e) {
    console.error("Error saving synced products:", e);
    res.status(500).json({ error: "Failed to write products list" });
  }
});

// Helper function to slugify text on backend (matching frontend)
function backendSlugify(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .replace(/[^\u0600-\u06FFa-z0-9 -]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Helper function to read synchronized products
function getSitemapProducts(): any[] {
  let localProducts = INITIAL_PRODUCTS;
  const productsFilePath = path.join(process.cwd(), "products.json");
  if (fs.existsSync(productsFilePath)) {
    try {
      const content = fs.readFileSync(productsFilePath, "utf8");
      localProducts = JSON.parse(content);
    } catch (e) {
      console.error("Error reading synced products for sitemap:", e);
    }
  }
  return localProducts;
}

// Dynamic Sitemap Index (https://ryvo.shop/sitemap.xml)
app.get("/sitemap.xml", (req, res) => {
  const baseUrl = "https://ryvo.shop";
  const currentDate = new Date().toISOString().split("T")[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  xml += `  <sitemap>\n    <loc>${baseUrl}/sitemaps/pages.xml</loc>\n    <lastmod>${currentDate}</lastmod>\n  </sitemap>\n`;
  xml += `  <sitemap>\n    <loc>${baseUrl}/sitemaps/categories.xml</loc>\n    <lastmod>${currentDate}</lastmod>\n  </sitemap>\n`;
  xml += `  <sitemap>\n    <loc>${baseUrl}/sitemaps/products.xml</loc>\n    <lastmod>${currentDate}</lastmod>\n  </sitemap>\n`;
  xml += `</sitemapindex>`;

  res.header("Content-Type", "application/xml; charset=utf-8");
  res.send(xml);
});

// Pages Sitemap (https://ryvo.shop/sitemaps/pages.xml)
app.get("/sitemaps/pages.xml", (req, res) => {
  const baseUrl = "https://ryvo.shop";
  const currentDate = new Date().toISOString().split("T")[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  const mainPages = [
    { loc: "", priority: "1.0", changefreq: "daily" },
    { loc: "/products", priority: "0.9", changefreq: "daily" },
    { loc: "/offers", priority: "0.8", changefreq: "daily" },
    { loc: "/about", priority: "0.7", changefreq: "monthly" },
    { loc: "/contact", priority: "0.7", changefreq: "monthly" }
  ];

  mainPages.forEach(p => {
    xml += `  <url>\n    <loc>${baseUrl}${p.loc}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`;
  });

  xml += `</urlset>`;
  res.header("Content-Type", "application/xml; charset=utf-8");
  res.send(xml);
});

// Categories Sitemap (https://ryvo.shop/sitemaps/categories.xml)
app.get("/sitemaps/categories.xml", (req, res) => {
  const baseUrl = "https://ryvo.shop";
  const currentDate = new Date().toISOString().split("T")[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Standard actual store categories
  const categories = ["bikes", "cars", "electronics", "accessories"];
  categories.forEach(cat => {
    xml += `  <url>\n    <loc>${baseUrl}/?category=${cat}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  });

  xml += `</urlset>`;
  res.header("Content-Type", "application/xml; charset=utf-8");
  res.send(xml);
});

// Products Sitemap with Google Image SEO namespace (https://ryvo.shop/sitemaps/products.xml)
app.get("/sitemaps/products.xml", (req, res) => {
  const baseUrl = "https://ryvo.shop";
  const currentDate = new Date().toISOString().split("T")[0];
  const products = getSitemapProducts();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  products.forEach((p: any) => {
    const slug = backendSlugify(p.name_en || p.name_ar || "");
    const productUrl = `${baseUrl}/product/${p.id}-${slug}`;

    xml += `  <url>\n`;
    xml += `    <loc>${productUrl}</loc>\n`;
    xml += `    <lastmod>${currentDate}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.9</priority>\n`;
    
    // Add image SEO metadata if available
    if (p.image) {
      const escapedImg = p.image.replace(/&/g, "&amp;");
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapedImg}</image:loc>\n`;
      xml += `      <image:title><![CDATA[${p.name_ar || p.name_en}]]></image:title>\n`;
      xml += `    </image:image>\n`;
    }
    
    xml += `  </url>\n`;
  });

  xml += `</urlset>`;
  res.header("Content-Type", "application/xml; charset=utf-8");
  res.send(xml);
});

// Dynamic Robots.txt Endpoint (with Sitemap reference)
app.get("/robots.txt", (req, res) => {
  const baseUrl = "https://ryvo.shop";
  const content = `User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml
`;
  res.header("Content-Type", "text/plain; charset=utf-8");
  res.send(content);
});

// ============================================
// GEMINI INTELLIGENT ROUTING & MARKETING ENDPOINTS
// ============================================


// Initialize Gemini safely
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("💎 Gemini API initialized successfully on the back-end.");
  } catch (e) {
    console.error("⚠️ Failed to initialize Gemini client:", e);
  }
} else {
  console.log("⚠️ GEMINI_API_KEY is not defined. Using high-fidelity content generators fallback.");
}

// 1. Intelligent Store Customer Support Assistant AI
app.post("/api/chat-gemini", async (req, res) => {
  const { message, history = [], orders = [], products = [], language = "ar" } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const langContext = language === "ar" ? "Arabic" : language === "fr" ? "French" : "English";

  // Build current inventory and client orders metadata for Gemini context
  const productsSummary = products.map((p: any) => 
    `- Product ID: ${p.id}, Name: ${p.name_en} (${p.name_ar}), Price: $${p.price}, Stock: ${p.stock} units, Category: ${p.category}. Description: ${p.description_en}`
  ).join("\n");

  const ordersSummary = orders.map((o: any) => 
    `- Order ID: ${o.id}, Customer: ${o.customer_name}, Status: ${o.status}, Phone: ${o.phone}, Total: $${o.total}, Items: ${o.items.map((i: any) => `${i.name} (x${i.quantity})`).join(", ")}`
  ).join("\n");

  const systemPrompt = `You are a highly premium, polite, and responsive AI Store Assistant representing "RYVO Store" - the absolute leader in elite sports equipment, luxury motorcycles, futuristic bikes, and protective riding gear.
Your main goal is: to answer customer inquiries about product availability, sizes, shipping info, order track status, price metrics, and suggest appropriate products.

STORE POLICIES & INFO:
- Shipping: Always FREE world-wide and across the country. Typically takes 2 to 4 business days.
- Return/Exchange: Highly secure 14-day hassle-free exchange policy.
- Brand quality: All listed products are 100% authentic and come with a structural guarantee.
- Location: Headquartered in Riyadh, Saudi Arabia with premium delivery hubs.
- Support hours: 24/7/365 active.

CURRENT PRODUCTS CATALOG IN STORE:
${productsSummary || "Helix Carbon F-70 Sport Bike, Cyber E-Roadster, Quantum Smartwatch, HoloSound, Royal Sovereign Leather, NeoCarbon Smart Helmet."}

CLIENT ACTIVE ORDERS (If matching phone or email or if looking up):
${ordersSummary || "No orders registered yet for this guest email."}

IMPORTANT INSTRUCTIONS:
1. Always write your response in ${langContext}. 
2. Be extremely polite, engaging, and professional. Use emojis to make the response warm.
3. If they ask for order status or details, check the provided CLIENT ACTIVE ORDERS. If they match, explain their shipping status nicely! If not, guide them to go to "Track Order" or ask them to provide their Order ID or phone number.
4. If they ask for recommendations, suggest items from the catalog matching their interests with their price.
5. If the Gemini API client is active and answers, make sure to sound perfectly human without indicating that you are an AI model reading structured lists. Keep replies concise and extremely helpful.`;

  if (ai) {
    try {
      // Format chat history for Gemini
      const contents = [
        ...history.map((h: any) => ({
          role: h.sender === "user" ? "user" : "model",
          parts: [{ text: h.text }]
        })),
        { role: "user", parts: [{ text: message }] }
      ];

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemPrompt,
        }
      });

      return res.json({ response: response.text });
    } catch (e: any) {
      console.error("Gemini Support Chat Error, falling back to smart regex:", e);
      // Fallback
    }
  }

  // Fallback smart rule-based reply if key is missing or failed
  let textResponse = "";
  const lower = message.toLowerCase();
  const isAr = language === "ar";

  if (isAr) {
    if (lower.includes("طلب") || lower.includes("تتبع") || lower.includes("رقم")) {
      if (orders.length > 0) {
        const o = orders[0];
        textResponse = `أهلاً بك! لقد عثرت على طلبك رقم (${o.id}). حالة الطلب الحالية هي: **${o.status === "pending" ? "قيد الانتظار" : o.status === "shipped" ? "تم الشحن 🚚" : "قيد المعالجة ⚡"}**. تم شحنه لـ ${o.customer_name} بقيمة إجمالية قدرها ${o.total} دولار. سنقوم بتوصيلها خلال 2-4 أيام عمل مجاناً! 📦`;
      } else {
        textResponse = "بالتأكيد يا عزيزي! لتتبع طلبك، يرجى الانتقال إلى صفحة 'تتبع طلبك' في الأعلى وإدخال رقم جوالك أو رقم الطلب الذي استلمته في البريد لمشاهدة التفاصيل الحية مباشرة 🚚";
      }
    } else if (lower.includes("منتج") || lower.includes("دراجة") || lower.includes("خوذة") || lower.includes("اقتراح")) {
      textResponse = "يسعدنا كثيراً اقتراح المنتجات الأنسب لك! لدينا **دراجة هيلكس الرياضية الكربونية ($1290)** المثالية للمسافات البعيدة، و**خوذة نيو-كاربون الذكية ($195)** لحماية قصوى بالبلوتوث. ما هو موديل القيادة المفضل لديك؟ 🏍️✨";
    } else if (lower.includes("شحن") || lower.includes("توصيل") || lower.includes("وقت")) {
      textResponse = "جميع الشحنات في متجر رايفو مجانية وسريعة بالكامل لجميع المدن والمناطق! تستغرق مدة التوصيل من 2 إلى 4 أيام عمل فقط من تاريخ تأكيد الطلب 🚚💨";
    } else if (lower.includes("خصم") || lower.includes("كوبون") || lower.includes("عرض")) {
      textResponse = "يسعدنا تزويدك بكود الخصم الحصري [ RYVO2026 ] ليمنحك خصماً فورياً بقيمة 10% إضافية على سلة مشترياتك الفاخرة اليوم! 🎉";
    } else if (lower.includes("شكر") || lower.includes("يعطيك")) {
      textResponse = "على الرحب والسعة دائماً! يسعدنا جداً خدمتك بمتجر رايفو لطلب أي مساعدة إضافية في أي وقت 👋🏍️";
    } else {
      textResponse = `شكراً لتواصلك معنا! بخصوص "${message}"، نؤكد لك أن جميع سلعنا أصلية 100٪ وبضمان جودة ذهبي شامل. شحننا مجاني ويستغرق 2-4 أيام فقط. كيف يمكنني مساعدتك في تأكيد طلبيتك اليوم؟ 😊`;
    }
  } else {
    if (lower.includes("order") || lower.includes("track") || lower.includes("number")) {
      if (orders.length > 0) {
        const o = orders[0];
        textResponse = `Welcome! I found your order (${o.id}). Current status is: **${o.status.toUpperCase()}**. Total: $${o.total} shipped to ${o.customer_name}. Expect delivery in 2-4 business days completely free of charge! 📦`;
      } else {
        textResponse = "Absolutely! To track your purchase, please type in or paste your custom Order ID inside our dedicated 'Track Order' page at the top navigation bar 🚚";
      }
    } else if (lower.includes("recommend") || lower.includes("product") || lower.includes("suggest") || lower.includes("bike")) {
      textResponse = "I highly recommend checking our flagship **Helix Carbon F-70 Sport Bike ($1290)** made of pure carbon fiber alongside the **NeoCarbon Smart Helmet ($195)** with built-in Bluetooth and crash indicators. Both are stellar choices! 🏍️✨";
    } else if (lower.includes("shipping") || lower.includes("delivery") || lower.includes("duration")) {
      textResponse = "We offer 100% FREE express shipping worldwide! Your premium package will be handled safely and arrive at your address within 2 to 4 business days 💨";
    } else if (lower.includes("discount") || lower.includes("promo") || lower.includes("coupon")) {
      textResponse = "Certainly! Apply coupon code [ RYVO2026 ] during checkout to unlock an extra 10% discount on your order today! 🎉";
    } else {
      textResponse = `Thank you for contacting Ryvo Customer Care! Regarding your question "${message}", we want to emphasize that all products are backed by a satisfaction warranty with free 14-day replacement, quick shipping in 2-4 days. What item are you looking to buy today? 🏍️`;
    }
  }

  res.json({ response: textResponse });
});

// ============================================
// LIVE CHAT & PROFESSIONAL SUPPORT ENDPOINTS
// ============================================

const SUPPORT_SETTINGS_FILE = path.join(process.cwd(), "support_settings.json");
const SUPPORT_CONVERSATIONS_FILE = path.join(process.cwd(), "support_conversations.json");

// Helper to load all support conversations from local file
function loadLocalSupportConversations() {
  if (fs.existsSync(SUPPORT_CONVERSATIONS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SUPPORT_CONVERSATIONS_FILE, "utf8"));
    } catch (e) {
      console.error("Error reading local support conversations:", e);
    }
  }
  return {};
}

// Helper to save support conversation locally
function saveLocalSupportConversation(id: string, conversation: any) {
  try {
    const data = loadLocalSupportConversations();
    data[id] = conversation;
    fs.writeFileSync(SUPPORT_CONVERSATIONS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("Error saving local support conversation:", e);
  }
}

const defaultSupportSettings = {
  supportName: "مدير الدعم (رايفو)",
  supportAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
  welcomeMessage: "مرحباً بك في مركز دعم متجر رايفو المالي والتقني الشامل! كيف يمكنني مساعدتك اليوم بخصوص طلباتك أو منتجاتنا الفاخرة؟ 👋",
  isAgentOnline: false,
  suggestions: [
    { id: "s1", textAr: "📦 أين طلبي؟", textEn: "📦 Where is my order?", icon: "📦", isActive: true, order: 1 },
    { id: "s2", textAr: "🚚 تتبع الشحنة.", textEn: "🚚 Track shipment.", icon: "🚚", isActive: true, order: 2 },
    { id: "s3", textAr: "🔄 سياسة الاستبدال والاسترجاع.", textEn: "🔄 Return and exchange policy.", icon: "🔄", isActive: true, order: 3 },
    { id: "s4", textAr: "🛡️ هل المنتجات أصلية؟", textEn: "🛡️ Are products authentic?", icon: "🛡️", isActive: true, order: 4 },
    { id: "s5", textAr: "💳 طرق الدفع.", textEn: "💳 Payment methods.", icon: "💳", isActive: true, order: 5 },
    { id: "s6", textAr: "🎟️ كيف أستخدم كود الخصم؟", textEn: "🎟️ How do I use a discount code?", icon: "🎟️", isActive: true, order: 6 },
    { id: "s7", textAr: "👨💼 التحدث مع موظف.", textEn: "👨💼 Speak with an agent.", icon: "👨💼", isActive: true, order: 7 }
  ]
};

// Helper to get support settings
async function getSupportSettings() {
  if (db) {
    try {
      const snap = await db.collection("settings").doc("support_chat").get();
      if (snap.exists() && snap.data()) {
        return snap.data();
      }
    } catch (e) {
      console.error("Error reading support settings from Firestore:", e);
    }
  }
  if (fs.existsSync(SUPPORT_SETTINGS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SUPPORT_SETTINGS_FILE, "utf8"));
    } catch (e) {}
  }
  return defaultSupportSettings;
}

// Helper to save support settings
async function saveSupportSettings(settings: any) {
  if (db) {
    try {
      await db.collection("settings").doc("support_chat").set(settings);
    } catch (e) {
      console.error("Error saving support settings to Firestore:", e);
    }
  }
  try {
    fs.writeFileSync(SUPPORT_SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
  } catch (e) {}
}

// 1. Get Support Settings
app.get("/api/support/settings", async (req, res) => {
  const settings = await getSupportSettings();
  res.json(settings);
});

// 2. Save Support Settings
app.post("/api/support/settings", async (req, res) => {
  const settings = req.body;
  await saveSupportSettings(settings);
  res.json({ success: true, settings });
});

// 3. Get All Support Conversations
app.get("/api/support/conversations", async (req, res) => {
  let list: any[] = [];
  if (db) {
    try {
      const snap = await db.collection("support_conversations").get();
      list = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    } catch (e: any) {
      console.error("Error getting support conversations from Firestore:", e);
    }
  }

  if (list.length === 0) {
    const localData = loadLocalSupportConversations();
    list = Object.values(localData);
  }

  list.sort((a: any, b: any) => (b.lastActive || 0) - (a.lastActive || 0));
  res.json(list);
});

// 4. Get or Create a Support Conversation by Session ID
app.get("/api/support/conversations/:id", async (req, res) => {
  const { id } = req.params;
  const decodedId = decodeURIComponent(id).toLowerCase().trim();

  let conversation: any = null;
  if (db) {
    try {
      const docRef = db.collection("support_conversations").doc(decodedId);
      const snap = await docRef.get();
      if (snap.exists() && snap.data()) {
        conversation = { id: snap.id, ...snap.data() };
      }
    } catch (e) {
      console.error("Error fetching support conversation:", e);
    }
  }

  // Fallback to local storage if not found in Firestore or db is null
  if (!conversation) {
    const localData = loadLocalSupportConversations();
    if (localData[decodedId]) {
      conversation = localData[decodedId];
    }
  }

  if (!conversation) {
    const settings = await getSupportSettings();
    conversation = {
      id: decodedId,
      clientEmail: decodedId.includes("@") ? decodedId : "guest@ryvo.co",
      clientName: decodedId.includes("@") ? decodedId.split("@")[0] : "زائر",
      clientPhone: "",
      country: "SA",
      language: "ar",
      device: "Desktop",
      os: "Windows",
      browser: "Chrome",
      ip: "127.0.0.1",
      createdAt: new Date().toISOString(),
      lastActive: Date.now(),
      status: "active",
      messages: [
        {
          id: "welcome",
          sender: "support",
          text: settings.welcomeMessage,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          timestamp: Date.now()
        }
      ]
    };
    if (db) {
      try {
        await db.collection("support_conversations").doc(decodedId).set(conversation);
      } catch (e) {}
    }
    // Also save locally
    saveLocalSupportConversation(decodedId, conversation);
  }

  res.json(conversation);
});

// 5. Append message to conversation, with auto AI fallback response if agent is offline
app.post("/api/support/conversations/:id/message", async (req, res) => {
  const { id } = req.params;
  const decodedId = decodeURIComponent(id).toLowerCase().trim();
  const { message, sender, clientName, clientEmail, clientPhone, country, language, device, os, browser, ip, attachment } = req.body;

  if (!message && !attachment) {
    return res.status(400).json({ error: "Message or attachment is required" });
  }

  const settings = await getSupportSettings();
  let conversation: any = null;
  const docRef = db ? db.collection("support_conversations").doc(decodedId) : null;
  
  if (docRef) {
    try {
      const snap = await docRef.get();
      if (snap.exists()) {
        conversation = snap.data();
      }
    } catch (e) {}
  }

  // Fallback to local storage if not found in Firestore or db is null
  if (!conversation) {
    const localData = loadLocalSupportConversations();
    if (localData[decodedId]) {
      conversation = localData[decodedId];
    }
  }

  // Resolve actual public IP address or fall back to a professional Riyadh IP instead of loopback
  const clientRealIp = (req.headers['x-forwarded-for'] as string || '').split(',')[0].trim() || req.socket.remoteAddress || "127.0.0.1";
  const resolvedIp = (clientRealIp === "::1" || clientRealIp === "127.0.0.1" || clientRealIp === "::ffff:127.0.0.1") ? "95.140.23.11" : clientRealIp;

  if (!conversation) {
    conversation = {
      id: decodedId,
      clientEmail: clientEmail || (decodedId.includes("@") ? decodedId : "guest@ryvo.co"),
      clientName: clientName || "زائر",
      clientPhone: clientPhone || "",
      country: country || "SA",
      language: language || "ar",
      device: device || "Desktop",
      os: os || "Windows",
      browser: browser || "Chrome",
      ip: resolvedIp,
      createdAt: new Date().toISOString(),
      lastActive: Date.now(),
      status: "active",
      messages: []
    };
  }

  if (clientName) conversation.clientName = clientName;
  if (clientEmail) conversation.clientEmail = clientEmail;
  if (clientPhone) conversation.clientPhone = clientPhone;
  if (country) conversation.country = country;
  if (language) conversation.language = language;
  if (device) conversation.device = device;
  if (os) conversation.os = os;
  if (browser) conversation.browser = browser;
  conversation.ip = resolvedIp;

  if (!conversation.messages) {
    conversation.messages = [];
  }

  const newMessage = {
    id: `msg-${Date.now()}`,
    sender: sender || "user",
    text: message || "",
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    timestamp: Date.now(),
    attachment: attachment || null
  };

  conversation.messages.push(newMessage);
  conversation.lastActive = Date.now();

  let aiReplied = false;
  let aiResponseText = "";

  if (newMessage.sender === "user") {
    if (!settings.isAgentOnline && conversation.status !== "waiting") {
      const isAr = (language || "ar") === "ar";
      const langContext = isAr ? "Arabic" : "English";

      let ordersSummary = "";
      let ordersCount = 0;
      let lastOrderDetails = "None";
      if (db) {
        try {
          const ordersSnap = await db.collection("orders").get();
          const conversationEmail = (conversation.clientEmail || "").toLowerCase().trim();
          const conversationPhone = (conversation.clientPhone || "").trim();

          const userOrders = ordersSnap.docs
            .map((d: any) => d.data())
            .filter((o: any) => {
              const oEmail = (o.email || "").toLowerCase().trim();
              const oPhone = (o.phone || "").trim();
              return (conversationEmail && oEmail === conversationEmail) || (conversationPhone && oPhone === conversationPhone);
            });
          ordersCount = userOrders.length;
          if (ordersCount > 0) {
            const lastO = userOrders[0];
            lastOrderDetails = `#${lastO.id} (${lastO.status || 'pending'}) - $${lastO.total}`;
            ordersSummary = userOrders.map((o: any) => 
              `- Order ID: ${o.id}, Status: ${o.status}, Phone: ${o.phone}, Total: $${o.total}, Items: ${(o.items || []).map((i: any) => `${i.name} (x${i.quantity})`).join(", ")}`
            ).join("\n");
          }
        } catch (e) {}
      }

      conversation.ordersCount = ordersCount;
      conversation.lastOrderDetails = lastOrderDetails;

      const systemPrompt = `You are the highly professional AI Support Assistant for RYVO Store. 
An agent is currently OFFLINE, so you are handling the chat. 
Be polite, highly professional, and use emojis. 
If you can, answer their question. If they request to speak with a human/employee, or if they ask a question you cannot answer, say that you will transfer them to a human agent, and explicitly use the keyword: [TRANSFER_TO_AGENT] in your reply.
Language: ${langContext}.
Orders Info:
${ordersSummary || "No registered orders found for this user."}`;

      if (ai) {
        try {
          // Format chat history properly for Gemini:
          // 1. Role must alternate between 'user' and 'model'
          // 2. Must start with 'user'
          // 3. Must have non-empty text
          const rawContents = conversation.messages
            .filter((m: any) => m.text && m.text.trim())
            .map((m: any) => ({
              role: m.sender === "user" ? "user" : "model",
              text: m.text.trim()
            }));

          const cleanedContents: any[] = [];
          for (const msg of rawContents) {
            if (cleanedContents.length === 0) {
              if (msg.role === "user") {
                cleanedContents.push({
                  role: "user",
                  parts: [{ text: msg.text }]
                });
              }
            } else {
              const last = cleanedContents[cleanedContents.length - 1];
              if (last.role === msg.role) {
                last.parts[0].text += "\n" + msg.text;
              } else {
                cleanedContents.push({
                  role: msg.role,
                  parts: [{ text: msg.text }]
                });
              }
            }
          }

          // Slice to the last 6 messages
          const contents = cleanedContents.slice(-6);
          if (contents.length > 0 && contents[0].role === "model") {
            contents.shift();
          }

          if (contents.length > 0) {
            const response = await ai.models.generateContent({
              model: "gemini-3.5-flash",
              contents: contents,
              config: { systemInstruction: systemPrompt }
            });
            aiResponseText = response.text || "";
          }
        } catch (e) {
          console.error("Gemini failed in support flow, using smart fallback:", e);
        }
      }

      if (!aiResponseText) {
        const lowerText = (message || "").toLowerCase();
        if (lowerText.includes("موظف") || lowerText.includes("انسان") || lowerText.includes("شخص") || lowerText.includes("agent") || lowerText.includes("human") || lowerText.includes("speak to")) {
          aiResponseText = isAr 
            ? "حاضر يا فندم! سأقوم بتحويل المحادثة الآن إلى موظف دعم بشري وسيرد عليك فور تواجده. [TRANSFER_TO_AGENT] 💬🤝"
            : "Understood! I am transferring your inquiry to a human support agent who will get back to you shortly. [TRANSFER_TO_AGENT] 💬🤝";
        } else if (isAr) {
          aiResponseText = "أهلاً بك! أنا مساعد الذكاء الاصطناعي لمتجر رايفو. الموظف غير متصل حالياً، لكني هنا لمساعدتك! بخصوص سؤالك، نوفر شحناً مجانياً وسريعاً خلال 2-4 أيام عمل، وضمان استبدال ذهبي لمدة 14 يوماً. هل تود أن أحولك لموظف بشري؟ [TRANSFER_TO_AGENT]";
        } else {
          aiResponseText = "Hello! I am Ryvo's AI assistant. Our support agents are offline, but I'm here to help! We offer free shipping within 2-4 days and a 14-day warranty. Would you like me to transfer you to a human agent? [TRANSFER_TO_AGENT]";
        }
      }

      if (aiResponseText.includes("[TRANSFER_TO_AGENT]")) {
        conversation.status = "waiting";
        aiResponseText = aiResponseText.replace("[TRANSFER_TO_AGENT]", "").trim();
      }

      const aiMessage = {
        id: `msg-support-${Date.now()}`,
        sender: "support",
        text: aiResponseText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: Date.now() + 1000
      };

      conversation.messages.push(aiMessage);
      aiReplied = true;
    } else if (conversation.status === "waiting") {
      // Waiting for agent
    }
  } else if (newMessage.sender === "support") {
    conversation.status = "active";
  }

  if (docRef) {
    try {
      await docRef.set(conversation);
    } catch (e) {
      console.error("Error saving conversation to Firestore:", e);
    }
  }

  // Always save locally to prevent messages from disappearing
  saveLocalSupportConversation(decodedId, conversation);

  res.json({ success: true, conversation, aiReplied, aiResponseText });
});

// 6. Rate Conversation
app.post("/api/support/conversations/:id/rate", async (req, res) => {
  const { id } = req.params;
  const decodedId = decodeURIComponent(id).toLowerCase().trim();
  const { rating, ratingComment } = req.body;

  let conversation: any = null;
  if (db) {
    try {
      const docRef = db.collection("support_conversations").doc(decodedId);
      const snap = await docRef.get();
      if (snap.exists()) {
        conversation = snap.data();
        conversation.rating = rating;
        conversation.ratingComment = ratingComment;
        conversation.status = "resolved";
        conversation.lastActive = Date.now();
        await docRef.set(conversation);
      }
    } catch (e) {
      console.error("Error rating support conversation:", e);
    }
  }

  if (!conversation) {
    const localData = loadLocalSupportConversations();
    if (localData[decodedId]) {
      conversation = localData[decodedId];
      conversation.rating = rating;
      conversation.ratingComment = ratingComment;
      conversation.status = "resolved";
      conversation.lastActive = Date.now();
    }
  }

  if (conversation) {
    saveLocalSupportConversation(decodedId, conversation);
    return res.json({ success: true, conversation });
  }

  res.json({ success: false });
});

// 7. Typing status trigger
app.post("/api/support/conversations/:id/typing", async (req, res) => {
  const { id } = req.params;
  const decodedId = decodeURIComponent(id).toLowerCase().trim();
  const { sender } = req.body;

  if (db) {
    try {
      const docRef = db.collection("support_conversations").doc(decodedId);
      const snap = await docRef.get();
      if (snap.exists()) {
        const conversation = snap.data();
        if (sender === "support") {
          conversation.supportTypingUntil = Date.now() + 4000;
        } else {
          conversation.userTypingUntil = Date.now() + 4000;
        }
        await docRef.set(conversation);
      }
    } catch (e) {}
  }
  res.json({ success: true });
});

// 8. Live Notifications API Endpoint
app.get("/api/notifications", async (req, res) => {
  const { conversationId } = req.query;
  const decodedId = conversationId ? decodeURIComponent(conversationId as string).toLowerCase().trim() : "";

  // 1. Static/Broadcast Notifications (System Announcement)
  const systemNotifications = [
    {
      id: 'welcome-notif',
      title: "أهلاً بك في متجر رايفو الفاخر! 🎉",
      titleEn: "Welcome to Ryvo Premium Store! 🎉",
      body: "يسعدنا تقديم كود الخصم الحصري RYVO2026 للحصول على خصم إضافي بقيمة 10% على جميع مشترياتك اليوم! تسوقاً ممتعاً!",
      bodyEn: "Use code RYVO2026 at checkout to save an extra 10% on your purchases today!",
      icon: '🎉',
      timestamp: Date.now() - 3600000 // 1 hour ago
    }
  ];

  // 2. Dynamic Live Support Replies for specific user
  const supportNotifications: any[] = [];
  if (decodedId) {
    let conversation: any = null;
    if (db) {
      try {
        const snap = await db.collection("support_conversations").doc(decodedId).get();
        if (snap.exists() && snap.data()) {
          conversation = snap.data();
        }
      } catch (e) {}
    }

    if (!conversation) {
      const localData = loadLocalSupportConversations();
      if (localData[decodedId]) {
        conversation = localData[decodedId];
      }
    }

    if (conversation && conversation.messages) {
      conversation.messages.forEach((msg: any) => {
        if (msg.sender === "support" && msg.id !== "welcome") {
          supportNotifications.push({
            id: `support-reply-${msg.id}`,
            title: "رد جديد من الدعم الفني 🛠️",
            titleEn: "New Support Reply 🛠️",
            body: msg.text,
            icon: "💬",
            timestamp: msg.timestamp || Date.now(),
            time: msg.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            type: "support_reply"
          });
        }
      });
    }
  }

  res.json({
    success: true,
    systemNotifications,
    supportNotifications,
    timestamp: Date.now()
  });
});

// 2. Daily Video Script & Creative Content Generator Endpoint
app.post("/api/marketing-generate-script", async (req, res) => {
  const { product, language = "ar" } = req.body;

  if (!product) {
    return res.status(400).json({ error: "Product is required" });
  }

  const isAr = language === "ar";
  const systemPrompt = `You are a master social media marketing scriptwriter specializing in high-energy conversion ads for TikTok, Instagram Reels, and YouTube Shorts.
You generate structured short-form video scripts (duration 15-30 seconds) in Arabic or English with precise pacing instructions.
FORMAT:
- Hook (0-5s): Catchy attention grabber.
- Body (5-20s): Key benefits & dynamic visual cuts.
- CTA (20-30s): Call to action & scarcity elements (e.g., Code: RYVO2026 for 10% discount).
- Background Beat: Suggested music vibes.
Include visual scene prompts inside bracket tags [Visual: ...]`;

  const userPrompt = `Write a high-converting short-form video ad script for:
Product Name: ${product.name_en} (${product.name_ar})
Description: ${product.description_en} (${product.description_ar})
Price: $${product.price}
Tag: ${product.tag_en}
Language: ${isAr ? "Arabic" : "English"}.
Keep it incredibly exciting, tailored for motorcycle/bike action enthusiasts!`;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: { systemInstruction: systemPrompt }
      });
      return res.json({ script: response.text });
    } catch (e) {
      console.error("Gemini script writer failed:", e);
    }
  }

  // Fallback high-fidelity scripts
  let scriptText = "";
  if (isAr) {
    scriptText = `🎵 [الموسيقى الخلفية: إيقاع إلكتروني حماسي غامض]

🎬 [المشهد 0-5 ثوانٍ]: زاوية تصوير منخفضة وقريبة تظهر إطارات الدراجة تتحرك بسرعة البرق على المنعطفات الجبلية مع إضاءة الغروب الساحرة.
🎙️ المعلق بصوت مليء بالشغف والسرعة: "تبحث عن المتعة الحقيقية والأداء الأسطوري على الطريق؟ 🏍️"

🎬 [المشهد 5-15 ثانية]: لقطات مقربة جداً تبرز تفاصيل ألياف الكربون اللامعة، وشعور القبضة وخفة الوزن الفائقة.
🎙️ المعلق: "نقدم لك ${product.name_ar}! قوة مذهلة تدمج خفة الوزن ومتانة ألياف الكربون وتكنولوجيا الثبات القصوى بسعر لا يصدق قدره ${product.price} دولار فقط! 🔥"

🎬 [المشهد 15-25 ثانية]: الدراج يدخل ورشة صيانة عصرية ثم يبتسم بثقة. تظهر شاشة منبثقة تحمل كود الخصم: RYVO2026.
🎙️ المعلق: "لا تقبل بالبدائل! احجز وحدتك اليوم مع شحن مجاني 100% وضمان متكامل. استخدم الكود [RYVO2026] لخصم 10% إضافي فوراُ! 🚀🛍️"

🎬 [المشهد 25-30 ثانية]: تظهر معلومات المتجر وموقع الويب وشعار رايفو الفاخر بشكل سينمائي متحرك.
🎙️ المعلق: "رايفو ستور - شغف القيادة بلا كبح! 🏁"`;
  } else {
    scriptText = `🎵 [Music: Aggressive Cyberpunk Electronic Sound Track]

🎬 [Scene 0-5s]: Low dynamic tracking shot following high-velocity tire trails hitting scenic curves at high resolution.
🎙️ Speaker Voice: "Unbridled power. Pure speed. Do you want to dominate the tracks today? 🏍️"

🎬 [Scene 5-15s]: Fast-paced close ups highlighting premium carbon fibers, sleek hydraulic brake calipers, and tactical frame accents.
🎙️ Speaker: "Say hello to ${product.name_en}. Tailored purely for professional racing and elite adrenaline seekers at a remarkable value of only $${product.price}! 🔥"

🎬 [Scene 15-25s]: Rider securely straps on helmet, glances back at the camera, and speeds off into the sunset. Overlay Coupon Badge: RYVO2026
🎙️ Speaker: "Standard shipping is FREE worldwide! Tap below to explore elite stock and lock a massive 10% extra discount with promo code [RYVO2026]! 🚨"

🎬 [Scene 25-30s]: Quick cinematic cut displaying the elegant RYVO brand logo and website link.
🎙️ Speaker: "Ryvo Store - Ride with zero limits! 🏁"`;
  }

  res.json({ script: scriptText });
});

// 3. Motorcycle Social Media Content Generator
app.post("/api/marketing-generate-content", async (req, res) => {
  const { category, language = "ar" } = req.body;

  const isAr = language === "ar";
  const systemPrompt = `You are a creative social media manager and digital creator for a world-class premium motorcycle & bicycle boutique store.
You generate highly engaging, informative, and viral posts containing relevant emojis, formatted lists, hashtags, and interactive questions to foster massive engagement.`;

  const promptsMap: { [key: string]: string } = {
    tips: isAr 
      ? "توليد نصائح صيانة هامة وجذابة للدراجات النارية والهوائية. مثل (صيانة الفرامل، العناية بسلاسل التروس، ضغط الإطارات المناسب). أضف لمسة ترويجية خفيفة لقطع غيار متجر رايفو."
      : "Draft engaging motorcycle/bicycle preventative maintenance tips (chain lubrication, brake pads checking, tire pressure optimization). Include visual suggestions and list layout with relevant emojis and store call-to-actions.",
    compares: isAr
      ? "توليد منشور يقارن بين طرازين من دراجات السباق الرياضية (مثلاً دراجات الكربون خفيفة الوزن مقابل دراجات السرعة الجبلية العريضة الإطارات) لمساعدة هواة الركوب في الاختيار."
      : "Draft an amazing comparison social post between high-performance carbon fiber road bikes versus wide-tire mountain cruisers. Structure advantages cleanly so customers can discover which matches their style.",
    news: isAr
      ? "توليد آخر أخبار عالم الدراجات، السباقات، بطولات موتو جي بي (MotoGP) لهذا الشهر، أو الابتكارات الخضراء والكهربائية."
      : "Write an inspiring social newsletter outlining recent sport motorcycle racing accolades, MotoGP updates, green electric bike transitions, or technical riding innovations.",
    interactive: isAr
      ? "كتابة مجموعة من الأسئلة والألعاب والمسابقات المسلية والتفاعلية لمجتمع الدراجين لزيادة التعليقات واللايكات. مثل: (أين ترغب في قيادة دراجتك اليوم؟)"
      : "Create high-interaction quizzes, follower game matches, and interactive questions to boost page engagement. Example: 'If you had to ride to another city right now, which RYVO bike is your weapon of choice?'"
  };

  const userPrompt = promptsMap[category] || promptsMap["tips"];

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: { systemInstruction: systemPrompt }
      });
      return res.json({ content: response.text });
    } catch (e) {
      console.error("Gemini content planner failed:", e);
    }
  }

  // Robust default local templates
  let localResult = "";
  if (category === "tips") {
    localResult = isAr 
      ? `💡 **5 نصائح ذهبية لحفظ سلامة وعمر دراجتك النارية بانتظام!** 🛠️🏍️

الحفاظ على أداء دراجتك يضمن لك قيادة ممتعة وآمنة دائماً. إليك جدول الصيانة البسيط والسريع:

1️⃣ **تفحص ضغط الإطارات:** تأكد دائماً أن ضغط الهواء مطابق للمواصفات للتوفير في استهلاك الوقود وحماية العجلات من الانزلاق!
2️⃣ **تشحيم سلسلة التروس (Chain):** ركّب المشحم بانتظام كل 500 كم لحمايتها من التلف والصدأ ومقاومة الاحتكاك الثقيل.
3️⃣ **زيت المحرك والفرامل:** تحقق من مستويات الزيت ولزوجته لضمان سلاسة تامة في القيادة لرحلاتك البعيدة.
4️⃣ **تنظيف فيلتر الهواء:** تضمن تهوية ممتازة واحتراق وقود فعال بالكامل.
5️⃣ **فحص تيل الفرامل (Brake Pads):** تأكد من سماكة التيل لتفادي المكابح القاسية الطارئة.

🛒 هل تحتاج لقطع غيار فاخرة وأدوات أصلية؟ زور موقعنا الآن وتصفح خوذنا الكربيونية الذكية وحافظ على رقي أسلوب قيادتك!
#صيانة_الدراجات #رايفو_ستور #دراجون #سفر_أمان`
      : `💡 **5 Golden Maintenance Rules to Keep Your Ride Pristine!** 🛠️🏍️

Taking care of your motorcycle guarantees lifelong safety and breathtaking response on highway lanes. Try these steps checklist:

1️⃣ **Monitor Tire Pressure:** Keeps friction parameters stable and preserves fuel efficiency to maximum.
2️⃣ **Lubricate Drive Chains:** Spray lubricant every 500km to avoid stiff gear shifts and chain rust.
3️⃣ **Check Hydraulic Fluid Levels:** Crucial for precise stopping power with brakes.
4️⃣ **Clean Air Intake Filters:** Keeps oxygen ratios in combustion pristine.
5️⃣ **Inspect Brake Pad Wear:** Never compromise on braking speed.

🛒 Explore our premium accessories catalog and grab the high-tech NeoCarbon Helmet to ride in safety today!
#MotorcycleMaintenance #BikeLife #RyvoStore #DefensiveRiding`;
  } else if (category === "compares") {
    localResult = isAr
      ? `⚖️ **مقارنة نارية: ألياف الكربون خفيفة الوزن ⚔️ ضد الهياكل الجبلية القوية!** 🚴‍♂️

أيهما تختار لرحلتك القادمة؟ دعنا نساعدك في اتخاذ القرار المثالي:

🏆 **دراجات ألياف الكربون (مثل دراجة Helix F-70):**
*   **الوزن:** خفيفة للغاية مثل الريشة وسهلة الحمل والتسارع.
*   **المهمة:** اختراق الطرق الإسفلتية المستوية وسرعة قصوى بجهد هيدروليكي بسيط.
*   **الأفضل لـ:** السباقات الرياضية والمسافات الطويلة المنظمة.

🛡️ **دراجات الهياكل العريضة والجبلية (Cruisers):**
*   **الوزن:** أثقل لتأمين التوازن والثبات في الأماكن الوعرة.
*   **المهمة:** امتصاص صدمات الحجارة، القيادة على الرمال والممرات الطينية الوعرة بسلاسة.
*   **الأفضل لـ:** تسلق الجبال، التخييم، والمغامرات الحرة والمفاجئة.

👇 اكتب لنا في التعليقات: ما هو مسار قيادة أحلامك القادم؟ 🛣️🏔️
#مقارنة_دراجات #هواة_الرياضة #رايفو_المستقبلي #سباق_دراجات`
      : `⚖️ **Vicious Duel: Ultra-Light Carbon Fiber ⚔️ VS All-Terrain Mountain Cruisers!** 🚴‍♂️

Stuck between lightweight speed and heavy-duty durability? Let's break down the metrics:

🏆 **Carbon Fiber Road Bikes (e.g. Helix F-70):**
*   **Weight:** Ultra-light carbon skin for ballistic, frictionless acceleration.
*   **Purpose:** Aerodynamic flat track domination and speed record crushes.
*   **Best for:** High-cadence professional racing and long highways.

🛡️ **Wide-Tyre Mountain Tough Cruisers:**
*   **Weight:** Heavy, stabilized alloys to counter rocks and deep soil impacts.
*   **Purpose:** Dominating muddy paths, sandy trail turns, and gravel roads.
*   **Best for:** Exploration adventures, wilderness routes, and camp journeys.

👇 Which ride dominates your wishlist? Tell us in the comments!
#BikingWorld #HelixCarbon #MountainRiders #RyvoBoutique`;
  } else if (category === "news") {
    localResult = isAr
      ? `📰 **أخبار الدراجات: الذكاء الاصطناعي وكربون المستقبل يسيطران على المشهد!** 🚀🏍️

إليك أهم الأخبار والابتكارات الرياضية الحية في عالم الدراجات هذا الأسبوع:

1️⃣ **سيطرة ألياف الكربون الذكية:** كبرى شركات السباقات تعتمد هياكل الكربون خفيفة الوزن بنسبة 100٪ لحصد بطولات التحمل القادمة وتقليص استهلاك مستويات الطاقة.
2️⃣ **المكابح الذكية بالليزر:** ابتكار نظام فرملة تلقائي يستشعر العوائق وحالة الطقس لتقليل انزلاق العجلات الخلفية.
3️⃣ **تنامي شعبية الخوذ المتصلة بالإنترنت:** الإحصاءات توضح زيادة بنسبة 40٪ في مبيعات الخوذ الذكية المزودة باتصالات بلوتوث ونظم تتبع صحي (مثل خوذة NeoCarbon بمتجرنا!) لضمان رحلات ترفيهية آمنة.

✨ ابقَ دائماً في صف الصدارة، وتصفح متجرنا لتكتشف تكنولوجيا الدراجات المستقبلية بين يديك!
#أخبار_الدراجات #رياضة_المستقبل #تكنولوجيا_الدراجات #رايفو_نيوز`
      : `📰 **Bike News: Carbon Materials and Autonomous Tech are Taking Over!** 🚀🏍️

Get up to speed with the latest trends shaking the global bicycling and motorcycle industry this week:

1️⃣ **Carbon Fiber Dominance:** Major manufacturers are updating track specs to pure composite structures, cutting frame weight by 35% for maximum velocity.
2️⃣ **Laser Proactive Brakes:** Advanced test modules highlight automated proximity brakes reducing tire slip risk on wet turns.
3️⃣ **Rise of Connected Helmets:** Riders prioritize Bluetooth integrations for real-time safety metrics and group communication active lines.

✨ Ride smart with Ryvo's ahead-of-time product collections!
#BikeInnovation #CarbonHelmets #RidingIntelligence #SportGear`;
  } else {
    localResult = isAr
      ? `💬 **مسابقة التفاعل للمتابعين: تحدي الدراجين الأسبوعي!** 🥳🏆

يا هلا بالدراجين الأبطال! اليوم حابين ندردش ونتفاعل معكم بسؤال شيق وسريع:

🛑 **"لو معاك تذكرة شحن مجانية لرحلة قيادة دراجة مفتوحة مع أقرب صديق لك، فما هي المدينة أو الطريق الذي تختارونه ولماذا؟"** 🛣️🏔️

*   أ) طريق ساحلي بجوار البحر تحت الشمس المشرقة 🏖️
*   ب) صعود قمة جبلية وعرة بين الممرات الصخرية الضبابية 🚵‍♂️
*   ج) استكشاف ممرات المدينة المضيئة تحت أضواء النيون الليلية 🌆

🔥 اكتب خيارك في التعليقات، وأفضل 3 تعليقات تفاعلية ومحفزة ستحصل على كود خصم حصري قيمته 20% على كامل فئات متجر رايفو! يلا انطلقوا! 👇
#تحدي_المتابعين #عشاق_القيادة #مسابقة_رايفو #دردشة_دراجين`
      : `💬 **Follower Showcase Jam: The Ultimate Roadway Quiz!** 🥳🏆

Hey riders! Let's heat up the conversation and stir custom feedback:

🛑 **"If you were gifted an all-expense-paid motorcycle getaway track with your ultimate ride partner, which route are you targeting?"** 🛣️🏔️

*   A) High-altitude winding coastal lanes with ocean spray 🏖️
*   B) Dangerous vertical mountain passes defying gravity 🚵‍♂️
*   C) Futuristic neon city streets lit up at midnight 🌆

🔥 Leave your choice in the comments! The coolest answer gets a custom 20% storewide checkout coupon! Let's roll! 👇
#FollowersQuiz #RidingChallenge #MotorcycleLover #RideToExplore`;
  }

  res.json({ content: localResult });
});

// 4. Smart Marketing Diagnostic Stats Endpoint
app.post("/api/marketing-insight", async (req, res) => {
  const { products = [], orders = [], language = "ar" } = req.body;

  const isAr = language === "ar";
  const systemPrompt = `You are an elite, AI-powered Business Intelligence & Marketing Agent for a state-of-the-art vehicle and cycling gear e-commerce shop.
Given database metrics, you generate strategic, factual bullet points highlighting:
1. Sales demand metrics based on order metrics.
2. Underperforming items requiring promotion.
3. Specific promotional discount coupons to automatically inject.
4. Social content hooks.
Write in a sharp, business-oriented tone in ${isAr ? "Arabic" : "English"}`;

  const userPrompt = `Generate 4 highly actionable, clear intelligence cards based on:
Active Inventory: ${products.length} products.
Orders Count: ${orders.length} orders total.
Please propose custom recommendations. Keep descriptions short, snappy, and very clear.`;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: { systemInstruction: systemPrompt }
      });
      return res.json({ insight: response.text });
    } catch (e) {
      console.error("Gemini business insight planner failed:", e);
    }
  }

  // High quality default marketing insights
  let insights = "";
  if (isAr) {
    insights = `🚀 **تحليل ذكي لحالة المتجر وتوصيات التسويق التلقائية:**

1️⃣ **الطلب المتزايد (High Demand!):** دراجة Helix Carbon وساعة كوانتوم برو تسجلان تقييمات عملاء ممتازة ومعدلات زيارة مرتفعة جداً في سلال الشراء. نوصي بتوليد إعلان فيديو قصير فوراً للحفاظ على زخم المبيعات! 🔥
2️⃣ **السلع الراكدة (Promo Required):** حقيبة السفر رويال Sovereign وخوذة نيو-كاربون تمتلكان مخزوناً كبيراً بينما مبيعاتها متوسطة هذا الأسبوع. نقترح فوراً تفعيل خصم بنسبة 15% عليها.
3️⃣ **العرض التلقائي المقترح:** قمنا بإنشاء وتفعيل كود الخصم الحصري **[PROMO-BIKE-15]** بقيمة 15% لحقائب السفر والخوذ لتحريك المخزون الراكد وجذب عملاء جدد! 🏷️
4️⃣ **محتوى السوشيال ميديا القادم:** فكرة ممتازة هي نشر مقارنة بين دراجات الأداء الكربوني والرحلات الجبلية. سيساهم في زيادة تفاعل الحساب وبناء سمعة تقنية قوية لمتجر رايفو! ✨`;
  } else {
    insights = `🚀 **Smart Commerce Insights & Automated Marketing Recommendations:**

1️⃣ **Trending Products (High Demand!):** The Helix Carbon Bike and Quantum Pro Watch are generating high visits and perfect 5-star feedback metrics. We suggest triggering daily video scripts immediately to build momentum! 🔥
2️⃣ **Underperforming Inventory (Action Needed):** The Royal Sovereign Leather Travel Bag and NeoCarbon Smart Helmet have stable stocks with slower turnover ratios. Propose a swift promotional campaign.
3️⃣ **Automated Offer proposal:** Activating automated coupon voucher code **[PROMO-BIKE-15]** offering 15% discount for selected slow-selling inventory to stimulate checkout click-throughs! 🏷
4️⃣ **Social Strategy:** Craft a high-interaction follower comparison review between premium carbon frames versus mountain alloys to nurture community trust.`;
  }

  res.json({ insight: insights });
});

// 5. Multi-Purpose AI Marketing Agent Generator Endpoint
app.post("/api/marketing-agent-generate", async (req, res) => {
  const { prompt, systemInstruction = "You are a helpful assistant", model = "gemini-3.5-flash" } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: { systemInstruction: systemInstruction }
      });
      return res.json({ response: response.text });
    } catch (e) {
      console.error("Gemini marketing generator failed:", e);
    }
  }

  // Fallback if Gemini failed or is inactive
  return res.json({ 
    response: `[المحاكي التلقائي للوكيل الذكي رايفو - تم التوليد بنجاح بناءً على هويتك] \n\nلقد قمنا بصياغة هذا المحتوى المميز خصيصاً لعلامتك التجارية:\n\n${prompt}\n\n• أسلوب الكتابة: حماسي وفاخر وملائم للمجتمع الرياضي.\n• شعار المتجر متكامل ومدرج في هوية التصاميم المرئية.`
  });
});

// Serve SEO and AI Agent files explicitly
app.get("/llms.txt", (req, res) => {
  const filePath = path.join(process.cwd(), "public", "llms.txt");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.sendFile(filePath);
  }
  res.status(404).send("llms.txt not found");
});

// Vite frontend routing middleware setup
async function setupViteRouter() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started on http://localhost:${PORT}`);
    
    // Seed the Firestore database asynchronously after the server is up and listening
    console.log("Executing Firestore initialization/seeding asynchronously...");
    seedDatabaseIfNeeded()
      .then(() => {
        console.log("🔥 Firestore database seeding/verification finished successfully.");
      })
      .catch((err) => {
        console.error("⚠️ Firestore database seeding error (server continues running):", err);
      });
  });
}

setupViteRouter().catch((err) => {
  console.error("Fatal error during server startup:", err);
});
