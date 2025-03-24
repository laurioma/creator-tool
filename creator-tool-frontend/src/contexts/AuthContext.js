import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password, profile) {
    try {
      // Create the user account
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's profile in Auth
      await updateProfile(result.user, {
        displayName: profile.displayName,
        photoURL: profile.photoURL
      });

      // Create the user document in Firestore
      const userRef = doc(db, 'users', result.user.uid);
      await setDoc(userRef, {
        displayName: profile.displayName,
        email: result.user.email,
        accountType: profile.accountType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      return result;
    } catch (error) {
      console.error('Error during signup:', error);
      throw error;
    }
  }

  async function login(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result;
  }

  function logout() {
    return signOut(auth);
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  async function updateUserProfile(user, profile) {
    try {
      // Update the user's display name in Firebase Auth
      await updateProfile(user, {
        displayName: profile.displayName,
        photoURL: profile.photoURL
      });

      // Update user data in Firestore
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        displayName: profile.displayName,
        email: user.email,
        accountType: profile.accountType,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  async function getUserRole(uid) {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return userDoc.data().accountType;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const role = await getUserRole(user.uid);
          setUserRole(role);
        } else {
          setUserRole(null);
        }
        setCurrentUser(user);
      } catch (error) {
        console.error('Error in auth state change:', error);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    signup,
    login,
    logout,
    resetPassword,
    updateUserProfile,
    getUserRole
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 