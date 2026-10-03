import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  increment,
  getDocFromServer 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { ProjectData } from './types';

// Initialize Firebase App & Services
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection on Boot
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or connecting.');
    }
  }
}
testFirestoreConnection();

export interface CommunityProjectDoc {
  id: string;
  title: string;
  artistName: string;
  width: number;
  height: number;
  dpi?: number;
  backgroundColor?: string;
  hasTransparentBg?: boolean;
  thumbnail: string;
  layersData?: string;
  likesCount?: number;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Save / Publish a drawing project to the shared community database
 */
export async function publishProjectToCommunity(project: ProjectData): Promise<void> {
  const path = `projects/${project.id}`;
  try {
    const docRef = doc(db, 'projects', project.id);
    const payload: CommunityProjectDoc = {
      id: project.id,
      title: project.title || 'مشروع بدون عنوان',
      artistName: (project.artistName && project.artistName.trim()) ? project.artistName.trim() : 'رسام مجهول',
      width: project.width,
      height: project.height,
      dpi: project.dpi || 300,
      backgroundColor: project.backgroundColor || '#ffffff',
      hasTransparentBg: !!project.hasTransparentBg,
      thumbnail: project.thumbnail,
      layersData: JSON.stringify(project.layers),
      likesCount: project.likesCount || 0,
      createdAt: new Date(project.createdAt || Date.now()).toISOString(),
      updatedAt: new Date(Date.now()).toISOString(),
    };

    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Subscribe in real-time to all community projects uploaded by all artists
 */
export function subscribeToCommunityProjects(
  onProjectsUpdate: (projects: CommunityProjectDoc[]) => void,
  onError?: (err: Error) => void
) {
  const path = 'projects';
  const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: CommunityProjectDoc[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as CommunityProjectDoc;
        return {
          ...data,
          id: docSnap.id,
        };
      });
      onProjectsUpdate(items);
    },
    (error) => {
      if (onError) {
        onError(error as Error);
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

/**
 * Fetch all community projects once
 */
export async function getCommunityProjects(): Promise<CommunityProjectDoc[]> {
  const path = 'projects';
  try {
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as CommunityProjectDoc;
      return {
        ...data,
        id: docSnap.id,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Like / Appreciate a community artwork
 */
export async function likeCommunityProject(projectId: string): Promise<void> {
  const path = `projects/${projectId}`;
  try {
    const docRef = doc(db, 'projects', projectId);
    await updateDoc(docRef, {
      likesCount: increment(1),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Delete a community project
 */
export async function deleteCommunityProject(projectId: string): Promise<void> {
  const path = `projects/${projectId}`;
  try {
    const docRef = doc(db, 'projects', projectId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
