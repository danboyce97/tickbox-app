import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User as FirebaseUser,
  deleteUser as firebaseDeleteUser,
  OAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { auth, db, storage } from '../../config/firebase';

// Maximum file size for images (5MB) - helps prevent memory issues on older devices
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
// Maximum dimension for images (helps reduce memory usage)
const MAX_IMAGE_DIMENSION = 2048;
import { User } from '../state/userStore';
import { Memory } from '../state/memoryStore';
import { Friendship, FriendRequest } from '../state/friendStore';

// ============= Authentication =============

export const registerWithEmail = async (
  email: string,
  password: string,
  displayName: string,
  username: string
): Promise<FirebaseUser> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);

  // Update profile with display name
  if (userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }

  return userCredential.user;
};

export const signInWithEmail = async (
  email: string,
  password: string
): Promise<FirebaseUser> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
};

// Sign in with Apple using Firebase
export const signInWithApple = async (
  identityToken: string,
  nonce: string
): Promise<FirebaseUser> => {
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: identityToken,
    rawNonce: nonce,
  });

  const userCredential = await signInWithCredential(auth, credential);
  return userCredential.user;
};

export const deleteUserAccount = async (userId: string): Promise<void> => {
  if (auth.currentUser && auth.currentUser.uid === userId) {
    console.log('🗑️ Starting account deletion for user:', userId);

    try {
      // 1. Delete all user memories
      console.log('🗑️ Deleting user memories...');
      const userMemoriesQuery = query(collection(db, 'Tickets'), where('userId', '==', userId));
      const memoriesSnapshot = await getDocs(userMemoriesQuery);

      const memoryDeletions = memoriesSnapshot.docs.map(async (memoryDoc) => {
        const memoryData = memoryDoc.data() as Memory;

        // Delete associated images from Storage
        const allPhotos = [
          ...(memoryData.memoryPhotos || []),
          ...(memoryData.coverPhoto ? [memoryData.coverPhoto] : []),
          ...(memoryData.uploadedImage ? [memoryData.uploadedImage] : [])
        ];

        if (allPhotos.length > 0) {
          const imageDeletions = allPhotos.map(async (photoUrl: string) => {
            try {
              // Extract path from URL if it's a Firebase Storage URL
              if (photoUrl.includes('firebasestorage.googleapis.com')) {
                const pathMatch = photoUrl.match(/\/o\/(.+?)\?/);
                if (pathMatch) {
                  const imagePath = decodeURIComponent(pathMatch[1]);
                  await deleteImage(imagePath);
                  console.log('✅ Deleted image:', imagePath);
                }
              }
            } catch (error) {
              console.warn('⚠️ Failed to delete image:', photoUrl, error);
            }
          });
          await Promise.all(imageDeletions);
        }

        // Delete the memory document
        await deleteDoc(doc(db, 'Tickets', memoryDoc.id));
        console.log('✅ Deleted memory:', memoryDoc.id);
      });

      await Promise.all(memoryDeletions);
      console.log('✅ All memories deleted');

      // 2. Delete user's profile picture from Storage
      console.log('🗑️ Deleting profile picture...');
      const userData = await getUserDocument(userId);
      if (userData?.profilePhoto && userData.profilePhoto.includes('firebasestorage.googleapis.com')) {
        try {
          const pathMatch = userData.profilePhoto.match(/\/o\/(.+?)\?/);
          if (pathMatch) {
            const imagePath = decodeURIComponent(pathMatch[1]);
            await deleteImage(imagePath);
            console.log('✅ Deleted profile picture');
          }
        } catch (error) {
          console.warn('⚠️ Failed to delete profile picture:', error);
        }
      }

      // 3. Delete all friendships involving this user
      console.log('🗑️ Deleting friendships...');
      const friendshipsQuery1 = query(collection(db, 'friendsCollection'), where('user1Id', '==', userId));
      const friendshipsQuery2 = query(collection(db, 'friendsCollection'), where('user2Id', '==', userId));

      const [friendshipsSnapshot1, friendshipsSnapshot2] = await Promise.all([
        getDocs(friendshipsQuery1),
        getDocs(friendshipsQuery2)
      ]);

      const friendshipDeletions: Promise<void>[] = [];
      friendshipsSnapshot1.forEach((doc) => {
        friendshipDeletions.push(deleteDoc(doc.ref));
      });
      friendshipsSnapshot2.forEach((doc) => {
        friendshipDeletions.push(deleteDoc(doc.ref));
      });

      await Promise.all(friendshipDeletions);
      console.log('✅ All friendships deleted');

      // 4. Delete all friend requests involving this user
      console.log('🗑️ Deleting friend requests...');
      const friendRequestsQuery1 = query(collection(db, 'friendRequests'), where('fromUserId', '==', userId));
      const friendRequestsQuery2 = query(collection(db, 'friendRequests'), where('toUserId', '==', userId));

      const [requestsSnapshot1, requestsSnapshot2] = await Promise.all([
        getDocs(friendRequestsQuery1),
        getDocs(friendRequestsQuery2)
      ]);

      const requestDeletions: Promise<void>[] = [];
      requestsSnapshot1.forEach((doc) => {
        requestDeletions.push(deleteDoc(doc.ref));
      });
      requestsSnapshot2.forEach((doc) => {
        requestDeletions.push(deleteDoc(doc.ref));
      });

      await Promise.all(requestDeletions);
      console.log('✅ All friend requests deleted');

      // 5. Delete user document from Firestore
      console.log('🗑️ Deleting user document...');
      await deleteDoc(doc(db, 'users', userId));
      console.log('✅ User document deleted');

      // 6. Delete user authentication (this must be last)
      console.log('🗑️ Deleting Firebase Authentication user...');
      await firebaseDeleteUser(auth.currentUser);
      console.log('✅ Firebase Authentication user deleted');

      console.log('✅ Account deletion complete');
    } catch (error) {
      console.error('❌ Error during account deletion:', error);
      throw error;
    }
  } else {
    throw new Error('User not authenticated or userId mismatch');
  }
};

// ============= User Data =============

export const createUserDocument = async (
  userId: string,
  userData: Partial<User>
): Promise<void> => {
  await setDoc(doc(db, 'users', userId), {
    ...userData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const getUserDocument = async (userId: string): Promise<User | null> => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() } as User;
  }
  return null;
};

export const updateUserDocument = async (
  userId: string,
  updates: Partial<User>
): Promise<void> => {
  await updateDoc(doc(db, 'users', userId), {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const q = query(collection(db, 'users'), where('email', '==', email));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const userDoc = querySnapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() } as User;
  }
  return null;
};

export const findUserByAppleId = async (appleUserId: string): Promise<User | null> => {
  const q = query(collection(db, 'users'), where('appleUserId', '==', appleUserId));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const userDoc = querySnapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() } as User;
  }
  return null;
};

export const findUserByUsername = async (username: string): Promise<User | null> => {
  const q = query(collection(db, 'users'), where('username', '==', username));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const userDoc = querySnapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() } as User;
  }
  return null;
};

export const searchUsers = async (searchTerm: string): Promise<User[]> => {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);

  const users: User[] = [];
  snapshot.forEach((doc) => {
    const userData = { id: doc.id, ...doc.data() } as User;
    if (
      userData.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userData.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      users.push(userData);
    }
  });

  return users;
};

// ============= Memories =============

export const createMemory = async (memory: Memory): Promise<string> => {
  // Use the provided ID from the memory object
  const memoryRef = doc(db, 'Tickets', memory.id);

  // Remove undefined fields and the id field (since it's the document ID)
  const cleanMemory = Object.fromEntries(
    Object.entries(memory).filter(([key, value]) => value !== undefined && key !== 'id')
  );

  await setDoc(memoryRef, {
    ...cleanMemory,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return memoryRef.id;
};

export const getMemory = async (memoryId: string): Promise<Memory | null> => {
  const memoryDoc = await getDoc(doc(db, 'Tickets', memoryId));
  if (memoryDoc.exists()) {
    return { id: memoryDoc.id, ...memoryDoc.data() } as Memory;
  }
  return null;
};

export const updateMemory = async (
  memoryId: string,
  updates: Partial<Memory>
): Promise<void> => {
  console.log('🔥 Firebase updateMemory called:', { memoryId, updatesKeys: Object.keys(updates) });
  // Remove undefined fields to prevent Firestore errors
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, value]) => value !== undefined)
  );

  try {
    await updateDoc(doc(db, 'Tickets', memoryId), {
      ...cleanUpdates,
      updatedAt: serverTimestamp()
    });
    console.log('✅ Firebase updateMemory succeeded for:', memoryId);
  } catch (error) {
    console.error('❌ Firebase updateMemory failed:', memoryId, error);
    throw error;
  }
};

// Delete a comment from a memory - handles both top-level comments and replies
// Only works for memories the user owns (Firebase permissions)
export const deleteCommentFromMemory = async (
  memoryId: string,
  commentId: string,
  userId: string
): Promise<void> => {
  // Fetch the current memory
  const memoryDoc = await getDoc(doc(db, 'Tickets', memoryId));
  if (!memoryDoc.exists()) {
    throw new Error('Memory not found');
  }

  const memory = memoryDoc.data() as Memory;
  const comments = memory.comments || [];

  // Helper function to recursively remove comment from replies
  const removeCommentFromReplies = (commentsList: any[]): any[] => {
    return commentsList.map(comment => {
      if (comment.replies && comment.replies.length > 0) {
        const filteredReplies = comment.replies.filter((reply: any) => {
          return !(reply.id === commentId && reply.userId === userId);
        });
        return { ...comment, replies: removeCommentFromReplies(filteredReplies) };
      }
      return comment;
    });
  };

  // First try to remove from top-level comments
  let updatedComments = comments.filter(c => {
    return !(c.id === commentId && c.userId === userId);
  });

  // If no top-level comment was removed, try removing from replies
  if (updatedComments.length === comments.length) {
    updatedComments = removeCommentFromReplies(comments);
  }

  // Update the memory with the new comments array
  await updateDoc(doc(db, 'Tickets', memoryId), {
    comments: updatedComments,
    updatedAt: serverTimestamp()
  });
};

// ============= Separate Comments Collection =============
// Comments are stored in a separate collection to allow any authenticated user
// to add comments to any memory (avoids Firebase permission issues)

export interface FirebaseComment {
  id: string;
  memoryId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: string;
  parentId?: string;
  likes?: string[];
  deletedAt?: string;
}

// Add a comment to the MemoryComments collection
export const addCommentToMemory = async (
  comment: FirebaseComment
): Promise<void> => {
  const commentRef = doc(db, 'MemoryComments', comment.id);
  const cleanComment = Object.fromEntries(
    Object.entries(comment).filter(([_, value]) => value !== undefined)
  );
  await setDoc(commentRef, {
    ...cleanComment,
    createdAt: serverTimestamp()
  });
};

// Get all comments for a memory from the MemoryComments collection
export const getCommentsForMemory = async (memoryId: string): Promise<FirebaseComment[]> => {
  const q = query(
    collection(db, 'MemoryComments'),
    where('memoryId', '==', memoryId)
  );
  const querySnapshot = await getDocs(q);

  const comments: FirebaseComment[] = [];
  querySnapshot.forEach((doc) => {
    comments.push({ id: doc.id, ...doc.data() } as FirebaseComment);
  });

  return comments;
};

// Update a comment (for likes)
export const updateComment = async (
  commentId: string,
  updates: Partial<FirebaseComment>
): Promise<void> => {
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, value]) => value !== undefined)
  );
  await updateDoc(doc(db, 'MemoryComments', commentId), cleanUpdates);
};

// Delete a comment from the MemoryComments collection
export const deleteCommentById = async (commentId: string): Promise<void> => {
  await deleteDoc(doc(db, 'MemoryComments', commentId));
};

// Get all comments for multiple memories (for loading friend memories)
export const getCommentsForMemories = async (memoryIds: string[]): Promise<Map<string, FirebaseComment[]>> => {
  if (memoryIds.length === 0) return new Map();

  const commentsMap = new Map<string, FirebaseComment[]>();

  // Initialize empty arrays for all memory IDs
  memoryIds.forEach(id => commentsMap.set(id, []));

  // Firestore 'in' operator has a limit of 30 items
  const batchSize = 30;
  for (let i = 0; i < memoryIds.length; i += batchSize) {
    const batch = memoryIds.slice(i, i + batchSize);
    const q = query(
      collection(db, 'MemoryComments'),
      where('memoryId', 'in', batch)
    );
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
      const comment = { id: doc.id, ...doc.data() } as FirebaseComment;
      const existing = commentsMap.get(comment.memoryId) || [];
      existing.push(comment);
      commentsMap.set(comment.memoryId, existing);
    });
  }

  return commentsMap;
};

export const deleteMemory = async (memoryId: string): Promise<void> => {
  await deleteDoc(doc(db, 'Tickets', memoryId));
};

// Clean up orphaned memories (for migration - removes any memories not matching their document ID)
export const cleanupOrphanedMemories = async (userId: string): Promise<number> => {
  const q = query(collection(db, 'Tickets'), where('userId', '==', userId));
  const querySnapshot = await getDocs(q);

  let deletedCount = 0;
  const deletePromises: Promise<void>[] = [];

  querySnapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    const firestoreId = docSnapshot.id;
    const memoryId = data.id;

    // If the memory has an 'id' field that doesn't match the document ID, it's orphaned
    if (memoryId && memoryId !== firestoreId) {
      console.log(`🗑️ Deleting orphaned memory: Firestore ID=${firestoreId}, Memory ID=${memoryId}`);
      deletePromises.push(deleteDoc(doc(db, 'Tickets', firestoreId)));
      deletedCount++;
    }
  });

  await Promise.all(deletePromises);
  console.log(`✅ Cleaned up ${deletedCount} orphaned memories`);
  return deletedCount;
};

export const getUserMemories = async (userId: string): Promise<Memory[]> => {
  const q = query(collection(db, 'Tickets'), where('userId', '==', userId));
  const querySnapshot = await getDocs(q);

  const memories: Memory[] = [];
  querySnapshot.forEach((doc) => {
    memories.push({ id: doc.id, ...doc.data() } as Memory);
  });

  return memories;
};

/**
 * Repair memories that have showOnFeed missing/undefined (set them to true).
 * This fixes memories that were created before the showOnFeed field existed or
 * where the field was not saved correctly.
 */
export const repairMissingShowOnFeed = async (userId: string): Promise<number> => {
  const q = query(collection(db, 'Tickets'), where('userId', '==', userId));
  const querySnapshot = await getDocs(q);

  let repairedCount = 0;
  const repairPromises: Promise<void>[] = [];

  querySnapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    // If showOnFeed is missing (undefined), set it to true
    if (data.showOnFeed === undefined || data.showOnFeed === null) {
      console.log(`🔧 Repairing missing showOnFeed for memory: "${data.title}" (${docSnapshot.id})`);
      repairPromises.push(
        updateDoc(doc(db, 'Tickets', docSnapshot.id), { showOnFeed: true })
      );
      repairedCount++;
    }
  });

  await Promise.all(repairPromises);
  if (repairedCount > 0) {
    console.log(`✅ Repaired showOnFeed for ${repairedCount} memories`);
  }
  return repairedCount;
};

/**
 * Get a user's public memories (showOnFeed = true)
 * Used when viewing another user's profile
 */
export const getUserPublicMemories = async (userId: string): Promise<Memory[]> => {
  const q = query(
    collection(db, 'Tickets'),
    where('userId', '==', userId),
    where('showOnFeed', '==', true)
  );
  const querySnapshot = await getDocs(q);

  const memories: Memory[] = [];
  querySnapshot.forEach((doc) => {
    memories.push({ id: doc.id, ...doc.data() } as Memory);
  });

  return memories;
};

export const getFriendsMemories = async (friendIds: string[]): Promise<Memory[]> => {
  if (friendIds.length === 0) return [];

  const memories: Memory[] = [];

  // Firestore 'in' operator has a limit of 30 items, so we batch if needed
  const batchSize = 30;
  for (let i = 0; i < friendIds.length; i += batchSize) {
    const batch = friendIds.slice(i, i + batchSize);

    const q = query(
      collection(db, 'Tickets'),
      where('userId', 'in', batch),
      where('showOnFeed', '==', true)
    );
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
      memories.push({ id: doc.id, ...doc.data() } as Memory);
    });
  }

  return memories;
};

/**
 * Subscribe to friend memories in real-time for live updates on likes/comments
 * Returns an unsubscribe function
 */
export const subscribeToFriendsMemories = (
  friendIds: string[],
  callback: (memories: Memory[]) => void
): (() => void) => {
  if (friendIds.length === 0) {
    callback([]);
    return () => {};
  }

  const unsubscribers: (() => void)[] = [];
  const memoriesMap = new Map<string, Memory>();
  // Track which batches have fired at least once so we don't callback prematurely
  const batchSize = 30;
  const numBatches = Math.ceil(friendIds.length / batchSize);
  const batchFired = new Array(numBatches).fill(false);

  for (let i = 0; i < friendIds.length; i += batchSize) {
    const batchIndex = i / batchSize;
    const batch = friendIds.slice(i, i + batchSize);

    const q = query(
      collection(db, 'Tickets'),
      where('userId', 'in', batch),
      where('showOnFeed', '==', true)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      // Update the memories map with changes from this batch
      querySnapshot.forEach((doc) => {
        memoriesMap.set(doc.id, { id: doc.id, ...doc.data() } as Memory);
      });

      // Check for removed documents
      querySnapshot.docChanges().forEach((change) => {
        if (change.type === 'removed') {
          memoriesMap.delete(change.doc.id);
        }
      });

      batchFired[batchIndex] = true;

      // Only callback once ALL batches have fired at least once
      // This prevents race conditions where early batches fire before others load
      if (batchFired.every(Boolean)) {
        callback(Array.from(memoriesMap.values()));
      }
    });

    unsubscribers.push(unsubscribe);
  }

  // Return a function that unsubscribes from all listeners
  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
};

// ============= Storage =============

/**
 * Compresses an image to reduce memory usage and prevent crashes on older devices.
 * This is critical for iPhone XS and other devices with limited RAM.
 */
const compressImageForUpload = async (uri: string): Promise<string> => {
  try {
    console.log('🗜️ compressImageForUpload - Starting compression...');

    // Check file size first
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }

    const fileSize = 'size' in fileInfo ? fileInfo.size || 0 : 0;
    console.log('🗜️ compressImageForUpload - Original file size:', (fileSize / 1024 / 1024).toFixed(2), 'MB');

    // If file is already small enough, skip compression entirely
    if (fileSize < 500 * 1024) { // Less than 500KB
      console.log('🗜️ compressImageForUpload - File small enough, skipping compression');
      return uri;
    }

    // Determine compression quality based on file size
    // Larger files need more aggressive compression
    let quality = 0.7;
    if (fileSize > MAX_IMAGE_SIZE_BYTES) {
      quality = 0.5; // More aggressive for very large files
    } else if (fileSize > 2 * 1024 * 1024) {
      quality = 0.6; // Medium compression for 2MB+ files
    }

    // Compress the image
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_IMAGE_DIMENSION } }], // Resize to max dimension while maintaining aspect ratio
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG
      }
    );

    // Check new file size
    const newFileInfo = await FileSystem.getInfoAsync(manipulatedImage.uri);
    const newSize = newFileInfo.exists && 'size' in newFileInfo ? newFileInfo.size || 0 : 0;
    console.log('🗜️ compressImageForUpload - Compressed file size:', (newSize / 1024 / 1024).toFixed(2), 'MB');

    // If compression made the file bigger (can happen with PNGs), use original
    if (newSize >= fileSize) {
      console.log('🗜️ compressImageForUpload - Compressed larger than original, using original');
      // Clean up the larger compressed file
      try {
        await FileSystem.deleteAsync(manipulatedImage.uri, { idempotent: true });
      } catch (e) {
        // Ignore cleanup errors
      }
      return uri;
    }

    if (newSize > 0 && fileSize > 0) {
      console.log('🗜️ compressImageForUpload - Compression ratio:', ((1 - newSize / fileSize) * 100).toFixed(1), '% reduction');
    }

    return manipulatedImage.uri;
  } catch (error) {
    console.warn('⚠️ compressImageForUpload - Compression failed, using original:', error);
    // If compression fails, return original URI
    return uri;
  }
};

export const uploadImage = async (
  uri: string,
  path: string
): Promise<string> => {
  const maxRetries = 3;
  let lastError: any;
  let compressedUri = uri;

  // Compress image before upload to prevent memory issues
  try {
    compressedUri = await compressImageForUpload(uri);
  } catch (error) {
    console.warn('⚠️ uploadImage - Compression failed, proceeding with original:', error);
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📸 uploadImage - Starting upload (attempt ${attempt}/${maxRetries}):`, { uri: compressedUri, path });

      // Verify the file exists
      console.log('📸 uploadImage - Checking file exists...');
      const fileInfo = await FileSystem.getInfoAsync(compressedUri);

      if (!fileInfo.exists) {
        throw new Error('File does not exist at the specified URI');
      }

      console.log('📸 uploadImage - File info:', {
        exists: fileInfo.exists,
        size: fileInfo.size,
        uri: fileInfo.uri
      });

      // Use fetch to get blob directly from file URI - this is memory efficient
      // and doesn't require loading the entire file into memory as base64
      console.log('📸 uploadImage - Fetching blob from file URI...');
      const response = await fetch(compressedUri);
      const blob = await response.blob();

      console.log('📸 uploadImage - Blob created:', {
        size: blob.size,
        type: blob.type
      });

      if (blob.size === 0) {
        throw new Error('Image blob is empty - file may not be accessible');
      }

      const storageRef = ref(storage, path);
      console.log('📸 uploadImage - Storage ref created:', { path });

      await uploadBytes(storageRef, blob);
      console.log('📸 uploadImage - Upload complete');

      const downloadURL = await getDownloadURL(storageRef);
      console.log('📸 uploadImage - Download URL obtained:', downloadURL);

      // Clean up compressed file if it's different from original
      if (compressedUri !== uri) {
        try {
          await FileSystem.deleteAsync(compressedUri, { idempotent: true });
          console.log('🧹 uploadImage - Cleaned up compressed file');
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      return downloadURL;
    } catch (error: any) {
      lastError = error;
      console.error(`❌ uploadImage - Attempt ${attempt} failed:`, {
        message: error.message,
        code: error.code,
        serverResponse: error.serverResponse,
        customData: error.customData,
        name: error.name,
        uri: uri
      });

      // If this isn't the last attempt, wait before retrying
      if (attempt < maxRetries) {
        const delay = attempt * 1000; // 1s, 2s, 3s
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  console.error('❌ uploadImage - All attempts failed:', lastError);
  throw new Error(`Failed to upload image after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
};

// Maximum video file size (50MB) - larger videos need compression
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Compresses a video to reduce memory usage and prevent crashes on physical devices.
 * Uses expo-video-thumbnails for lightweight preview and reduces quality for large videos.
 */
const compressVideoForUpload = async (uri: string): Promise<string> => {
  try {
    console.log('🎬 compressVideoForUpload - Checking video size...');

    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('Video file does not exist');
    }

    const fileSize = 'size' in fileInfo ? fileInfo.size || 0 : 0;
    console.log('🎬 compressVideoForUpload - Video file size:', (fileSize / 1024 / 1024).toFixed(2), 'MB');

    // For now, we can't compress videos without additional native modules
    // But we can warn about large files and let the upload proceed
    // A future enhancement would be to use expo-av or a video compression library
    if (fileSize > MAX_VIDEO_SIZE_BYTES) {
      console.warn('⚠️ compressVideoForUpload - Video is large, may cause memory issues on older devices');
    }

    return uri;
  } catch (error) {
    console.warn('⚠️ compressVideoForUpload - Check failed, using original:', error);
    return uri;
  }
};

export const uploadVideo = async (
  uri: string,
  path: string
): Promise<string> => {
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🎬 uploadVideo - Starting upload (attempt ${attempt}/${maxRetries}):`, { uri, path });

      // Check video size first
      const fileInfo = await FileSystem.getInfoAsync(uri);

      if (!fileInfo.exists) {
        throw new Error('Video file does not exist at the specified URI');
      }

      const fileSize = 'size' in fileInfo ? fileInfo.size || 0 : 0;
      console.log('🎬 uploadVideo - File info:', {
        exists: fileInfo.exists,
        size: (fileSize / 1024 / 1024).toFixed(2) + ' MB',
        uri: fileInfo.uri
      });

      // For very large videos, warn but proceed
      if (fileSize > MAX_VIDEO_SIZE_BYTES) {
        console.warn(`⚠️ uploadVideo - Large video (${(fileSize / 1024 / 1024).toFixed(1)}MB), upload may take longer`);
      }

      // Use fetch to get blob - but limit memory usage by not holding references
      console.log('🎬 uploadVideo - Creating blob for upload...');

      // Create blob in a way that allows garbage collection
      let blob: Blob;
      {
        const response = await fetch(uri);
        blob = await response.blob();
      }
      // response is now out of scope and can be garbage collected

      console.log('🎬 uploadVideo - Blob created:', {
        size: (blob.size / 1024 / 1024).toFixed(2) + ' MB',
        type: blob.type
      });

      if (blob.size === 0) {
        throw new Error('Video blob is empty - file may not be accessible');
      }

      const storageRef = ref(storage, path);
      console.log('🎬 uploadVideo - Uploading to Firebase Storage...');

      await uploadBytes(storageRef, blob);

      // Clear blob reference to help garbage collection
      // @ts-ignore - intentionally clearing for memory management
      blob = null;

      console.log('🎬 uploadVideo - Upload complete, getting download URL...');

      const downloadURL = await getDownloadURL(storageRef);
      console.log('🎬 uploadVideo - Download URL obtained');

      // Give the JS engine time to garbage collect before returning
      await new Promise(resolve => setTimeout(resolve, 100));

      return downloadURL;
    } catch (error: any) {
      lastError = error;

      // Check if this is a memory-related crash
      const isMemoryError = error.message?.includes('memory') ||
                           error.message?.includes('heap') ||
                           error.message?.includes('allocation');

      console.error(`❌ uploadVideo - Attempt ${attempt} failed:`, {
        message: error.message,
        code: error.code,
        isMemoryError,
        uri: uri.substring(0, 50) + '...'
      });

      // If this isn't the last attempt, wait before retrying
      // Use longer delays for potential memory issues
      if (attempt < maxRetries) {
        const delay = isMemoryError ? attempt * 3000 : attempt * 2000;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  console.error('❌ uploadVideo - All attempts failed');
  throw new Error(`Failed to upload video after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
};

export const deleteImage = async (imagePath: string): Promise<void> => {
  const imageRef = ref(storage, imagePath);
  await deleteObject(imageRef);
};

// ============= Atomic Like/Reaction Operations =============

import { arrayUnion, arrayRemove } from 'firebase/firestore';

/**
 * Toggle a like on a memory atomically using arrayUnion/arrayRemove
 * This prevents race conditions and ensures accurate counts
 */
export const toggleMemoryLike = async (
  memoryId: string,
  userId: string,
  isCurrentlyLiked: boolean
): Promise<{ success: boolean; newLikeState: boolean }> => {
  try {
    const memoryRef = doc(db, 'Tickets', memoryId);

    if (isCurrentlyLiked) {
      // Remove like atomically
      await updateDoc(memoryRef, {
        likes: arrayRemove(userId),
        updatedAt: serverTimestamp()
      });
      console.log('✅ Like removed atomically for memory:', memoryId);
      return { success: true, newLikeState: false };
    } else {
      // Add like atomically
      await updateDoc(memoryRef, {
        likes: arrayUnion(userId),
        updatedAt: serverTimestamp()
      });
      console.log('✅ Like added atomically for memory:', memoryId);
      return { success: true, newLikeState: true };
    }
  } catch (error) {
    console.error('❌ Failed to toggle like:', error);
    return { success: false, newLikeState: isCurrentlyLiked };
  }
};

/**
 * Add or update a reaction on a memory
 * First removes any existing reaction from the user, then adds the new one
 */
export const setMemoryReaction = async (
  memoryId: string,
  userId: string,
  reactionType: string
): Promise<boolean> => {
  try {
    const memoryRef = doc(db, 'Tickets', memoryId);
    const memoryDoc = await getDoc(memoryRef);

    if (!memoryDoc.exists()) {
      console.error('❌ Memory not found:', memoryId);
      return false;
    }

    const memory = memoryDoc.data();
    const currentReactions = memory.reactions || [];

    // Remove any existing reaction from this user
    const filteredReactions = currentReactions.filter((r: any) => r.userId !== userId);

    // Add the new reaction
    const newReaction = {
      userId,
      type: reactionType,
      createdAt: new Date().toISOString()
    };

    await updateDoc(memoryRef, {
      reactions: [...filteredReactions, newReaction],
      // Also remove from legacy likes to prevent double counting
      likes: arrayRemove(userId),
      updatedAt: serverTimestamp()
    });

    console.log('✅ Reaction set for memory:', memoryId, reactionType);
    return true;
  } catch (error) {
    console.error('❌ Failed to set reaction:', error);
    return false;
  }
};

/**
 * Remove a reaction from a memory
 */
export const removeMemoryReaction = async (
  memoryId: string,
  userId: string
): Promise<boolean> => {
  try {
    const memoryRef = doc(db, 'Tickets', memoryId);
    const memoryDoc = await getDoc(memoryRef);

    if (!memoryDoc.exists()) {
      console.error('❌ Memory not found:', memoryId);
      return false;
    }

    const memory = memoryDoc.data();
    const currentReactions = memory.reactions || [];

    // Remove the user's reaction
    const filteredReactions = currentReactions.filter((r: any) => r.userId !== userId);

    await updateDoc(memoryRef, {
      reactions: filteredReactions,
      // Also remove from legacy likes
      likes: arrayRemove(userId),
      updatedAt: serverTimestamp()
    });

    console.log('✅ Reaction removed for memory:', memoryId);
    return true;
  } catch (error) {
    console.error('❌ Failed to remove reaction:', error);
    return false;
  }
};

/**
 * Subscribe to a single memory's updates in real-time
 * This is crucial for keeping like/reaction counts in sync across all views
 */
export const subscribeToMemory = (
  memoryId: string,
  callback: (memory: Memory | null) => void
): (() => void) => {
  const memoryRef = doc(db, 'Tickets', memoryId);

  return onSnapshot(memoryRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      const memory = { id: docSnapshot.id, ...docSnapshot.data() } as Memory;
      callback(memory);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('❌ Memory subscription error:', error);
    callback(null);
  });
};

/**
 * Toggle a like on a comment atomically
 */
export const toggleCommentLike = async (
  commentId: string,
  userId: string,
  isCurrentlyLiked: boolean
): Promise<boolean> => {
  try {
    const commentRef = doc(db, 'MemoryComments', commentId);

    if (isCurrentlyLiked) {
      await updateDoc(commentRef, {
        likes: arrayRemove(userId)
      });
    } else {
      await updateDoc(commentRef, {
        likes: arrayUnion(userId)
      });
    }

    console.log('✅ Comment like toggled:', commentId);
    return true;
  } catch (error) {
    console.error('❌ Failed to toggle comment like:', error);
    return false;
  }
};

/**
 * Subscribe to comments for a memory in real-time
 */
export const subscribeToMemoryComments = (
  memoryId: string,
  callback: (comments: FirebaseComment[]) => void
): (() => void) => {
  const q = query(
    collection(db, 'MemoryComments'),
    where('memoryId', '==', memoryId)
  );

  return onSnapshot(q, (querySnapshot) => {
    const comments: FirebaseComment[] = [];
    querySnapshot.forEach((doc) => {
      comments.push({ id: doc.id, ...doc.data() } as FirebaseComment);
    });
    callback(comments);
  }, (error) => {
    console.error('❌ Comments subscription error:', error);
    callback([]);
  });
};

// ============= Real-time Listeners =============

export const subscribeToUserData = (
  userId: string,
  callback: (user: User | null) => void
) => {
  return onSnapshot(doc(db, 'users', userId), (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() } as User);
    } else {
      callback(null);
    }
  });
};

export const subscribeToUserMemories = (
  userId: string,
  callback: (memories: Memory[]) => void
) => {
  const q = query(collection(db, 'Tickets'), where('userId', '==', userId));

  return onSnapshot(q, (querySnapshot) => {
    const memories: Memory[] = [];
    querySnapshot.forEach((doc) => {
      memories.push({ id: doc.id, ...doc.data() } as Memory);
    });
    callback(memories);
  });
};

// ============= Friendships =============

/**
 * Create a bidirectional friendship between two users
 */
export const createFriendship = async (
  user1Id: string,
  user2Id: string
): Promise<string> => {
  // Check if friendship already exists (in either direction)
  const existingFriendship = await areFriends(user1Id, user2Id);
  if (existingFriendship) {
    // Return empty string to indicate friendship already exists
    console.log(`⚠️ Friendship already exists between ${user1Id} and ${user2Id}`);
    return '';
  }

  const friendshipRef = doc(collection(db, 'friendsCollection'));
  const friendship: Omit<Friendship, 'id'> = {
    user1Id,
    user2Id,
    createdAt: new Date().toISOString(),
  };

  await setDoc(friendshipRef, {
    ...friendship,
    createdAtTimestamp: serverTimestamp(),
  });

  return friendshipRef.id;
};

/**
 * Remove a friendship between two users
 */
export const removeFriendship = async (
  user1Id: string,
  user2Id: string
): Promise<void> => {
  // Query for the friendship document
  const q1 = query(
    collection(db, 'friendsCollection'),
    where('user1Id', '==', user1Id),
    where('user2Id', '==', user2Id)
  );

  const q2 = query(
    collection(db, 'friendsCollection'),
    where('user1Id', '==', user2Id),
    where('user2Id', '==', user1Id)
  );

  const [snapshot1, snapshot2] = await Promise.all([
    getDocs(q1),
    getDocs(q2),
  ]);

  // Delete all matching friendship documents
  const deletions: Promise<void>[] = [];
  snapshot1.forEach((doc) => {
    deletions.push(deleteDoc(doc.ref));
  });
  snapshot2.forEach((doc) => {
    deletions.push(deleteDoc(doc.ref));
  });

  await Promise.all(deletions);
};

/**
 * Check if two users are friends
 */
export const areFriends = async (
  user1Id: string,
  user2Id: string
): Promise<boolean> => {
  // Check both directions separately to ensure accuracy
  const q1 = query(
    collection(db, 'friendsCollection'),
    where('user1Id', '==', user1Id),
    where('user2Id', '==', user2Id)
  );

  const q2 = query(
    collection(db, 'friendsCollection'),
    where('user1Id', '==', user2Id),
    where('user2Id', '==', user1Id)
  );

  const [snapshot1, snapshot2] = await Promise.all([
    getDocs(q1),
    getDocs(q2),
  ]);

  return !snapshot1.empty || !snapshot2.empty;
};

/**
 * Get all friendships for a user
 */
export const getUserFriendships = async (userId: string): Promise<Friendship[]> => {
  const q1 = query(
    collection(db, 'friendsCollection'),
    where('user1Id', '==', userId)
  );

  const q2 = query(
    collection(db, 'friendsCollection'),
    where('user2Id', '==', userId)
  );

  const [snapshot1, snapshot2] = await Promise.all([
    getDocs(q1),
    getDocs(q2),
  ]);

  const friendships: Friendship[] = [];
  snapshot1.forEach((doc) => {
    friendships.push({ id: doc.id, ...doc.data() } as Friendship);
  });
  snapshot2.forEach((doc) => {
    friendships.push({ id: doc.id, ...doc.data() } as Friendship);
  });

  return friendships;
};

/**
 * Get all friend IDs for a user
 */
export const getUserFriendIds = async (userId: string): Promise<string[]> => {
  const friendships = await getUserFriendships(userId);
  const friendIds = friendships.map((f) =>
    f.user1Id === userId ? f.user2Id : f.user1Id
  );
  return [...new Set(friendIds)]; // Remove duplicates
};

// ============= Friend Requests =============

/**
 * Send a friend request
 */
export const sendFriendRequest = async (
  fromUserId: string,
  toUserId: string
): Promise<string> => {
  // Check if request already exists
  const existingRequest = await getFriendRequest(fromUserId, toUserId);
  if (existingRequest) {
    return existingRequest.id;
  }

  const requestRef = doc(collection(db, 'friendRequests'));
  const request: Omit<FriendRequest, 'id'> = {
    fromUserId,
    toUserId,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(requestRef, {
    ...request,
    createdAtTimestamp: serverTimestamp(),
    updatedAtTimestamp: serverTimestamp(),
  });

  return requestRef.id;
};

/**
 * Get a specific friend request
 */
export const getFriendRequest = async (
  fromUserId: string,
  toUserId: string
): Promise<FriendRequest | null> => {
  const q = query(
    collection(db, 'friendRequests'),
    where('fromUserId', '==', fromUserId),
    where('toUserId', '==', toUserId),
    where('status', '==', 'pending')
  );

  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as FriendRequest;
  }

  return null;
};

/**
 * Update friend request status
 */
export const updateFriendRequestStatus = async (
  requestId: string,
  status: 'accepted' | 'declined'
): Promise<void> => {
  await updateDoc(doc(db, 'friendRequests', requestId), {
    status,
    updatedAt: new Date().toISOString(),
    updatedAtTimestamp: serverTimestamp(),
  });
};

/**
 * Get friend requests for a user
 */
export const getUserFriendRequests = async (
  userId: string,
  type: 'sent' | 'received'
): Promise<FriendRequest[]> => {
  const field = type === 'sent' ? 'fromUserId' : 'toUserId';
  const q = query(
    collection(db, 'friendRequests'),
    where(field, '==', userId)
  );

  const snapshot = await getDocs(q);
  const requests: FriendRequest[] = [];
  snapshot.forEach((doc) => {
    requests.push({ id: doc.id, ...doc.data() } as FriendRequest);
  });

  return requests;
};

/**
 * Delete a friend request
 */
export const deleteFriendRequest = async (requestId: string): Promise<void> => {
  await deleteDoc(doc(db, 'friendRequests', requestId));
};

// ============= Real-time Listeners for Friendships =============

/**
 * Subscribe to user's friendships in real-time
 */
export const subscribeToUserFriendships = (
  userId: string,
  callback: (friendships: Friendship[]) => void
) => {
  const q1 = query(
    collection(db, 'friendsCollection'),
    where('user1Id', '==', userId)
  );

  const q2 = query(
    collection(db, 'friendsCollection'),
    where('user2Id', '==', userId)
  );

  // Subscribe to both queries
  const unsubscribe1 = onSnapshot(q1, () => {
    // When either query updates, fetch all friendships
    getUserFriendships(userId).then(callback);
  });

  const unsubscribe2 = onSnapshot(q2, () => {
    getUserFriendships(userId).then(callback);
  });

  // Return a function that unsubscribes from both
  return () => {
    unsubscribe1();
    unsubscribe2();
  };
};

/**
 * Subscribe to user's friend requests in real-time
 */
export const subscribeToUserFriendRequests = (
  userId: string,
  type: 'sent' | 'received',
  callback: (requests: FriendRequest[]) => void
) => {
  const field = type === 'sent' ? 'fromUserId' : 'toUserId';
  const q = query(
    collection(db, 'friendRequests'),
    where(field, '==', userId)
  );

  return onSnapshot(q, (querySnapshot) => {
    const requests: FriendRequest[] = [];
    querySnapshot.forEach((doc) => {
      requests.push({ id: doc.id, ...doc.data() } as FriendRequest);
    });
    callback(requests);
  });
};

// ============= Notifications =============

export interface FirestoreNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
}

/**
 * Create a notification in Firestore
 */
export const createNotification = async (
  notification: Omit<FirestoreNotification, 'id' | 'createdAt'>
): Promise<string> => {
  const notificationRef = doc(collection(db, 'notifications'));
  await setDoc(notificationRef, {
    ...notification,
    createdAt: new Date().toISOString(),
    createdAtTimestamp: serverTimestamp(),
  });
  return notificationRef.id;
};

/**
 * Get notifications for a user
 */
export const getUserNotifications = async (userId: string): Promise<FirestoreNotification[]> => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  const notifications: FirestoreNotification[] = [];
  snapshot.forEach((doc) => {
    notifications.push({ id: doc.id, ...doc.data() } as FirestoreNotification);
  });
  // Sort by createdAt descending
  return notifications.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  await updateDoc(doc(db, 'notifications', notificationId), {
    read: true,
  });
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('read', '==', false)
  );
  const snapshot = await getDocs(q);
  const updates: Promise<void>[] = [];
  snapshot.forEach((doc) => {
    updates.push(updateDoc(doc.ref, { read: true }));
  });
  await Promise.all(updates);
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId: string): Promise<void> => {
  await deleteDoc(doc(db, 'notifications', notificationId));
};

/**
 * Subscribe to user's notifications in real-time
 */
export const subscribeToUserNotifications = (
  userId: string,
  callback: (notifications: FirestoreNotification[]) => void
) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (querySnapshot) => {
    const notifications: FirestoreNotification[] = [];
    querySnapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() } as FirestoreNotification);
    });
    // Sort by createdAt descending
    notifications.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    callback(notifications);
  });
};

/**
 * Send a push notification to a specific user via their push token
 * Calls Expo Push API directly to avoid dependency on a backend URL that may
 * differ between build environments (preview vs. production).
 */
export const sendPushNotificationToUser = async (
  userId: string,
  title: string,
  body: string,
  data?: any
): Promise<void> => {
  try {
    // Get the user's push token from their document
    const userDoc = await getUserDocument(userId);
    const pushToken = userDoc?.pushToken;

    if (!pushToken) {
      console.log(`📱 No push token for user ${userId}, skipping push notification`);
      return;
    }

    // Validate push token format
    if (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken[')) {
      console.log(`⚠️ Invalid push token format for user ${userId}`);
      return;
    }

    console.log(`📤 Sending push directly to Expo API for user ${userId}`);

    // Send directly to Expo Push API - avoids stale backend URL issues in production builds
    const message = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data: data || {},
      priority: 'high',
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const responseData = await response.json() as { data?: { status: string; message?: string; details?: any } };

    if (responseData.data?.status === 'ok') {
      console.log(`✅ Push notification sent successfully to user ${userId}`);
    } else if (responseData.data?.status === 'error') {
      const details = responseData.data.details as any;
      if (details?.error === 'DeviceNotRegistered') {
        // Token is stale - clear it so we don't keep trying
        console.log(`🗑️ Clearing stale push token for user ${userId}`);
        await updateUserDocument(userId, { pushToken: undefined });
      } else {
        console.error(`❌ Push notification error for user ${userId}:`, responseData.data.message);
      }
    } else {
      console.log(`📤 Push response for user ${userId}:`, JSON.stringify(responseData));
    }
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
  }
};

/**
 * Get all users with push tokens (for broadcast notifications)
 */
export const getAllUsersWithPushTokens = async (): Promise<{ userId: string; pushToken: string; displayName?: string }[]> => {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);

  const usersWithTokens: { userId: string; pushToken: string; displayName?: string }[] = [];
  snapshot.forEach((doc) => {
    const userData = doc.data();
    if (userData.pushToken) {
      usersWithTokens.push({
        userId: doc.id,
        pushToken: userData.pushToken,
        displayName: userData.displayName,
      });
    }
  });

  console.log(`📊 Found ${usersWithTokens.length} users with push tokens`);
  return usersWithTokens;
};

/**
 * Send a broadcast push notification to ALL users with push tokens
 */
export const sendBroadcastPushNotification = async (
  title: string,
  body: string,
  data?: any
): Promise<{ sent: number; failed: number; noToken: number }> => {
  console.log('📢 Starting broadcast push notification...');
  console.log(`📢 Title: ${title}`);
  console.log(`📢 Body: ${body}`);

  const usersWithTokens = await getAllUsersWithPushTokens();

  if (usersWithTokens.length === 0) {
    console.log('⚠️ No users with push tokens found');
    return { sent: 0, failed: 0, noToken: 0 };
  }

  // Expo Push API supports batch sending (up to 100 messages at once)
  const messages = usersWithTokens.map(user => ({
    to: user.pushToken,
    sound: 'default' as const,
    title,
    body,
    data: data || {},
    priority: 'high' as const,
  }));

  let sent = 0;
  let failed = 0;

  // Send in batches of 100
  const batchSize = 100;
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      const responseData = await response.json();
      console.log(`📬 Batch ${Math.floor(i / batchSize) + 1} response:`, JSON.stringify(responseData));

      if (response.ok && Array.isArray(responseData.data)) {
        responseData.data.forEach((result: any, index: number) => {
          if (result.status === 'ok') {
            sent++;
          } else {
            failed++;
            console.log(`❌ Failed to send to user ${usersWithTokens[i + index]?.userId}:`, result.message);
          }
        });
      } else {
        failed += batch.length;
      }
    } catch (error) {
      console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error);
      failed += batch.length;
    }
  }

  console.log(`📢 Broadcast complete: ${sent} sent, ${failed} failed`);
  return { sent, failed, noToken: 0 };
}

/**
 * Get public memories for the Discover feed.
 * Returns recent public memories from users who are NOT in the excludeUserIds list.
 * Uses a simpler query to avoid Firestore composite index requirements.
 */
export const getDiscoverMemories = async (
  excludeUserIds: string[],
  limitCount: number = 30
): Promise<Memory[]> => {
  try {
    // Fetch recent public memories (showOnFeed = true, not protected)
    const q = query(
      collection(db, 'Tickets'),
      where('showOnFeed', '==', true),
      where('isProtected', '==', false)
    );
    const querySnapshot = await getDocs(q);

    const memories: Memory[] = [];
    const excludeSet = new Set(excludeUserIds);

    querySnapshot.forEach((doc) => {
      const data = doc.data() as Memory;
      // Client-side filter: exclude current user and their friends
      if (!excludeSet.has(data.userId)) {
        memories.push({ ...data, id: doc.id });
      }
    });

    // Shuffle for variety, then take limit
    for (let i = memories.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [memories[i], memories[j]] = [memories[j], memories[i]];
    }

    return memories.slice(0, limitCount);
  } catch (error) {
    console.error('❌ Error fetching discover memories:', error);
    return [];
  }
};
