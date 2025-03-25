import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User,
  UserCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface Profile {
  displayName: string;
  photoURL?: string;
  accountType: string;
}

interface AuthContextType {
  currentUser: User | null;
  userRole: string | null;
  signup: (email: string, password: string, profile: Profile) => Promise<UserCredential>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (user: User, profile: Profile) => Promise<void>;
  getUserRole: (uid: string) => Promise<string | null>;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function signup(email: string, password: string, profile: Profile): Promise<UserCredential> {
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

  async function login(email: string, password: string): Promise<UserCredential> {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result;
  }

  function logout(): Promise<void> {
    return signOut(auth);
  }

  function resetPassword(email: string): Promise<void> {
    return sendPasswordResetEmail(auth, email);
  }

  async function updateUserProfile(user: User, profile: Profile): Promise<void> {
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

  async function getUserRole(uid: string): Promise<string | null> {
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

  const value: AuthContextType = {
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