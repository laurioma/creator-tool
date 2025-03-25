import React, { useState, useEffect, FormEvent } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Paper,
  Divider,
  Button,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  MenuItem,
  CircularProgress,
  ButtonBase
} from '@mui/material';
import {
  Explore as ExploreIcon,
  WorkHistory as WorkHistoryIcon,
  Share as ShareIcon,
  Add as AddIcon,
  LinkOff as LinkOffIcon,
  Close as CloseIcon,
  Link as LinkIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  getDoc, 
  addDoc, 
  DocumentData,
  DocumentReference,
  setDoc 
} from 'firebase/firestore';
import { 
  refreshCampaignSocialMediaStats, 
  validateSocialMediaUrl 
} from '../services/campaignStatsService';
import { SocialMediaStats, PlatformType } from '../utils/socialMediaUtils';

interface Creator {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  socialMediaLinks?: SocialMediaLink[];
  categories?: string[];
  [key: string]: any;
}

interface SocialMediaLink {
  id?: string;
  platform: PlatformType;
  url: string;
  username?: string;
  followers?: number;
  stats?: SocialMediaStats;
}

interface Campaign {
  id: string;
  name: string;
  description: string;
  budget: number;
  status: string;
  createdAt: string;
  ownerName: string;
  links?: SocialMediaLink[];
  [key: string]: any;
}

const drawerWidth = 240;

const CreatorDashboard: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<string>('dashboard');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [openLinkDialog, setOpenLinkDialog] = useState<boolean>(false);
  const [openProfileDialog, setOpenProfileDialog] = useState<boolean>(false);
  const [linkData, setLinkData] = useState<{ url: string; campaignId: string }>({
    url: '',
    campaignId: ''
  });
  const [profileData, setProfileData] = useState<{
    bio: string;
    categories: string[];
  }>({
    bio: '',
    categories: []
  });
  const [creatorProfile, setCreatorProfile] = useState<Creator | null>(null);
  const [refreshingStats, setRefreshingStats] = useState<boolean>(false);
  const [applyingToCampaignId, setApplyingToCampaignId] = useState<string>('');

  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      fetchCreatorProfile();
      fetchMyCampaigns();
      fetchAvailableCampaigns();
    }
  }, [currentUser]);

  const fetchCreatorProfile = async () => {
    try {
      if (!currentUser) return;

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        setCreatorProfile({
          id: userDoc.id,
          ...userDoc.data()
        } as Creator);

        // Initialize profile data from fetched profile
        setProfileData({
          bio: userDoc.data().bio || '',
          categories: userDoc.data().categories || []
        });
      }
    } catch (error) {
      console.error('Error fetching creator profile:', error);
      setError('Failed to load your profile. Please try again.');
    }
  };

  const fetchMyCampaigns = async () => {
    try {
      if (!currentUser) return;

      setLoading(true);
      
      // Get all campaigns where the creator is participating by querying with a prefix
      const creatorsRef = collection(db, 'campaignCreators');
      const q = query(creatorsRef, where('creatorId', '==', currentUser.uid));
      const snapshot = await getDocs(q);
      
      console.log('Found creator documents:', snapshot.size);
      
      snapshot.forEach(doc => {
        console.log('Creator document ID:', doc.id);
        console.log('Creator document data:', doc.data());
      });

      const campaignPromises = snapshot.docs.map(async (doc) => {
        const campaignRef = doc.data().campaignRef as DocumentReference;
        console.log('Campaign reference:', campaignRef, 'ID:', campaignRef.id, 'Path:', campaignRef.path);
        
        const campaignDoc = await getDoc(campaignRef);
        console.log('Campaign exists?', campaignDoc.exists(), 'ID:', campaignDoc.id);
        
        if (campaignDoc.exists()) {
          // Fetch links for this campaign
          const linksRef = collection(db, 'campaigns', campaignDoc.id, 'links');
          const linksQuery = query(linksRef, where('creatorId', '==', currentUser.uid));
          const linksSnapshot = await getDocs(linksQuery);
          
          console.log('Found links for campaign:', linksSnapshot.size);
          
          const links = linksSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as SocialMediaLink[];
          
          return {
            id: campaignDoc.id,
            ...campaignDoc.data(),
            links
          } as Campaign;
        }
        return null;
      });

      const resolvedCampaigns = await Promise.all(campaignPromises);
      setCampaigns(resolvedCampaigns.filter(Boolean) as Campaign[]);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      setError('Failed to load your campaigns. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCampaigns = async () => {
    try {
      if (!currentUser) return;

      // First get all active campaigns
      const campaignsRef = collection(db, 'campaigns');
      const campaignsQuery = query(campaignsRef, where('status', '==', 'active'));
      const campaignsSnapshot = await getDocs(campaignsQuery);
      
      // Get all campaigns the creator has already applied to
      const creatorsRef = collection(db, 'campaignCreators');
      const creatorsQuery = query(creatorsRef, where('creatorId', '==', currentUser.uid));
      const creatorsSnapshot = await getDocs(creatorsQuery);
      
      // Get campaign IDs that creator is already part of
      const appliedCampaignRefs = creatorsSnapshot.docs.map(doc => doc.data().campaignRef);
      const appliedCampaignIds = await Promise.all(
        appliedCampaignRefs.map(async (ref) => {
          if (ref) {
            return ref.id;
          }
          return null;
        })
      );
      
      // Filter out campaigns the creator has already applied to
      const availableCampaignsList = campaignsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Campaign))
        .filter(campaign => !appliedCampaignIds.filter(Boolean).includes(campaign.id));

      setAvailableCampaigns(availableCampaignsList);
    } catch (error) {
      console.error('Error fetching available campaigns:', error);
    }
  };

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
  };

  const handleOpenLinkDialog = (campaignId: string) => {
    setLinkData({ url: '', campaignId });
    setOpenLinkDialog(true);
  };

  const handleCloseLinkDialog = () => {
    setOpenLinkDialog(false);
    setError('');
  };

  // Function to ensure correct document format exists
  const ensureCorrectDocumentFormat = async (campaignId: string): Promise<boolean> => {
    try {
      if (!currentUser) return false;
      
      // Create document with exact ID format expected by security rules
      const docId = `${currentUser.uid}_${campaignId}`;
      console.log('Creating document with exact format ID:', docId);

      // Add creator to campaign using setDoc with the specific document ID
      await setDoc(doc(db, 'campaignCreators', docId), {
        campaignRef: doc(db, 'campaigns', campaignId),
        creatorId: currentUser.uid,
        campaignId: campaignId, // Add explicit campaignId field too
        status: 'applied',
        appliedAt: new Date().toISOString()
      });

      console.log('Fixed campaign application document created successfully');
      return true;
    } catch (error) {
      console.error('Error fixing campaign application:', error);
      return false;
    }
  };

  const handleLinkSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      if (!currentUser) {
        setError('You must be logged in to add a link');
        return;
      }

      if (!linkData.url.trim()) {
        setError('Please enter a valid URL');
        return;
      }

      setLoading(true);
      setError('');

      // Log the campaign ID to identify any issues
      console.log('Campaign ID:', linkData.campaignId, 'Type:', typeof linkData.campaignId);
      console.log('User ID:', currentUser.uid, 'Type:', typeof currentUser.uid);

      // Check for authorization with multiple approaches
      const campaignCreatorsRef = collection(db, 'campaignCreators');

      // 1. Try direct document ID lookup - this is the format the security rules require
      const docId = `${currentUser.uid}_${linkData.campaignId}`;
      console.log('Looking for document with ID:', docId);
      const creatorDocRef = doc(db, 'campaignCreators', docId);
      const creatorDoc = await getDoc(creatorDocRef);
      
      if (creatorDoc.exists()) {
        console.log('Document found with direct ID lookup:', creatorDoc.data());
      } else {
        console.log('Document not found with ID format required by security rules');
      }

      // 2. Try query with explicit campaignId field
      const creatorIdQuery = query(
        campaignCreatorsRef, 
        where('creatorId', '==', currentUser.uid),
        where('campaignId', '==', linkData.campaignId)
      );
      
      const creatorIdSnapshot = await getDocs(creatorIdQuery);
      console.log('Query by campaignId field returned:', creatorIdSnapshot.size, 'documents');

      // 3. Check all creator documents and compare campaignRef paths
      const allCreatorsQuery = query(campaignCreatorsRef, where('creatorId', '==', currentUser.uid));
      const allCreatorsSnapshot = await getDocs(allCreatorsQuery);
      
      let hasMatchingRef = false;
      allCreatorsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.campaignRef && data.campaignRef.path) {
          if (data.campaignRef.path.includes(linkData.campaignId)) {
            console.log('Found matching campaignRef path in document:', doc.id);
            hasMatchingRef = true;
          }
        }
      });

      // Determine if user is authorized by client-side checks
      const isAuthorized = creatorDoc.exists() || creatorIdSnapshot.size > 0 || hasMatchingRef;
      console.log('Is user authorized via client checks?', isAuthorized);
      
      if (isAuthorized) {
        // If we determined the user is authorized but the correct document format doesn't exist,
        // create it first to satisfy security rules
        if (!creatorDoc.exists() && hasMatchingRef) {
          console.log('User is authorized but the correctly formatted document doesn\'t exist. Creating it...');
          const formatFixed = await ensureCorrectDocumentFormat(linkData.campaignId);
          if (!formatFixed) {
            setError('Could not establish proper authorization. Please try again.');
            setLoading(false);
            return;
          }
        }
        
        // Validate URL
        const { platform, postId } = validateSocialMediaUrl(linkData.url);

        try {
          // Add link to campaign
          const linkRef = await addDoc(collection(db, 'campaigns', linkData.campaignId, 'links'), {
            url: linkData.url,
            creatorId: currentUser.uid,
            creatorName: currentUser.displayName || 'Anonymous',
            platform,
            addedAt: new Date().toISOString(),
            status: 'active'
          });

          console.log('Link added successfully with ID:', linkRef.id);

          // Close dialog and show success message
          handleCloseLinkDialog();
          setSuccess('Link added successfully!');
          
          // Refresh campaigns list
          fetchMyCampaigns();
        } catch (error: any) {
          console.error('Server rejected link creation:', error);
          setError('Server error: ' + error.message);
        }
      } else {
        console.error('You are not authorized to add links to this campaign');
        setError('You are not authorized to add links to this campaign. Please apply to the campaign first.');
      }
    } catch (error: any) {
      console.error('Error adding link:', error);
      setError(error.message || 'Failed to add link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStats = async (campaign: Campaign) => {
    try {
      setRefreshingStats(true);
      setError('');
      
      await refreshCampaignSocialMediaStats(campaign);
      
      setSuccess('Stats refreshed successfully!');
      fetchMyCampaigns(); // Refresh data
    } catch (error) {
      console.error('Error refreshing stats:', error);
      setError('Failed to refresh stats. Please try again.');
    } finally {
      setRefreshingStats(false);
    }
  };

  const handleOpenProfileDialog = () => {
    setOpenProfileDialog(true);
  };

  const handleCloseProfileDialog = () => {
    setOpenProfileDialog(false);
    setError('');
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      if (!currentUser) {
        setError('You must be logged in to update your profile');
        return;
      }

      setLoading(true);
      setError('');

      // Update user profile in Firestore
      await updateDoc(doc(db, 'users', currentUser.uid), {
        bio: profileData.bio,
        categories: profileData.categories,
        updatedAt: new Date().toISOString()
      });

      // Close dialog and show success message
      handleCloseProfileDialog();
      setSuccess('Profile updated successfully!');
      
      // Refresh profile data
      fetchCreatorProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSuccess('');
  };

  const handleApply = async (campaignId: string) => {
    try {
      if (!currentUser) {
        setError('You must be logged in to apply for campaigns');
        return;
      }

      setApplyingToCampaignId(campaignId);
      setError('');

      // Always create document with exact ID format required by security rules
      const docId = `${currentUser.uid}_${campaignId}`;
      console.log('Creating document with security rule compatible ID:', docId);

      // Add creator to campaign using setDoc with the specific document ID format for security rules
      await setDoc(doc(db, 'campaignCreators', docId), {
        campaignRef: doc(db, 'campaigns', campaignId),
        creatorId: currentUser.uid,
        campaignId: campaignId, // Add explicit campaignId field for easier querying
        status: 'applied',
        appliedAt: new Date().toISOString()
      });

      console.log('Document created successfully with security rule compatible ID format');

      // Refresh campaigns lists
      await fetchMyCampaigns();
      await fetchAvailableCampaigns();
      
      setSuccess('Successfully applied to campaign!');
      setApplyingToCampaignId('');
    } catch (error) {
      console.error('Error applying to campaign:', error);
      setError('Failed to apply to campaign. Please try again.');
      setApplyingToCampaignId('');
    }
  };

  const renderDashboard = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h2">Dashboard</Typography>
        <Button variant="outlined" onClick={handleOpenProfileDialog}>Update Profile</Button>
      </Box>
      
      {/* Creator Profile Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>Your Profile</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              {creatorProfile?.photoURL ? (
                <CardMedia
                  component="img"
                  image={creatorProfile.photoURL}
                  alt={creatorProfile.displayName}
                  sx={{ width: 150, height: 150, borderRadius: '50%', margin: '0 auto' }}
                />
              ) : (
                <Box 
                  sx={{ 
                    width: 150, 
                    height: 150, 
                    borderRadius: '50%', 
                    bgcolor: 'primary.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto'
                  }}
                >
                  <Typography variant="h3" color="white">
                    {creatorProfile?.displayName?.charAt(0) || 'C'}
                  </Typography>
                </Box>
              )}
              <Typography variant="h6" sx={{ mt: 2 }}>
                {creatorProfile?.displayName || 'Creator'}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={8}>
            <Typography variant="subtitle1" gutterBottom>Bio</Typography>
            <Typography variant="body1" paragraph>
              {creatorProfile?.bio || 'No bio yet. Update your profile to add a bio.'}
            </Typography>
            
            <Typography variant="subtitle1" gutterBottom>Categories</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {creatorProfile?.categories && creatorProfile.categories.length > 0 ? (
                creatorProfile.categories.map((category, index) => (
                  <Chip key={index} label={category} />
                ))
              ) : (
                <Typography variant="body2">No categories set</Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Active Campaigns Section */}
      <Typography variant="h5" gutterBottom>Your Active Campaigns</Typography>
      <Grid container spacing={3}>
        {campaigns.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1">
                You haven't joined any campaigns yet. Explore available campaigns to get started.
              </Typography>
              <Button 
                variant="contained" 
                sx={{ mt: 2 }}
                onClick={() => handleTabChange('explore')}
              >
                Explore Campaigns
              </Button>
            </Paper>
          </Grid>
        ) : (
          campaigns.map((campaign, campaignIndex) => (
            <Grid item xs={12} key={`campaign-${campaign.id}-${campaignIndex}`}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{campaign.name}</Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {campaign.description}
                  </Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle1" gutterBottom>Your Content Links</Typography>
                  {campaign.links && campaign.links.length > 0 ? (
                    <Box>
                      {campaign.links.map((link, linkIndex) => (
                        <Box key={`link-${campaign.id}-${linkIndex}-${link.id ?? ''}`} sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <LinkIcon sx={{ mr: 1 }} />
                              <Typography variant="body2" component="a" href={link.url} target="_blank" rel="noopener noreferrer">
                                {link.url}
                              </Typography>
                            </Box>
                            <Typography variant="caption">
                              Platform: {link.platform}
                            </Typography>
                          </Box>
                          
                          {link.stats && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2">
                                <strong>Stats:</strong> {link.stats.likes} likes, {link.stats.comments} comments
                                {link.stats.views ? `, ${link.stats.views} views` : ''}
                              </Typography>
                              <Typography variant="caption">
                                Last updated: {new Date(link.stats.lastUpdated as string).toLocaleString()}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      ))}
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                        <Button 
                          startIcon={<RefreshIcon />} 
                          onClick={() => handleRefreshStats(campaign)}
                          disabled={refreshingStats}
                        >
                          {refreshingStats ? 'Refreshing...' : 'Refresh Stats'}
                        </Button>
                        <Button 
                          variant="contained" 
                          startIcon={<AddIcon />}
                          onClick={() => handleOpenLinkDialog(campaign.id)}
                        >
                          Add Link
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Box>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        You haven't added any content links to this campaign yet.
                      </Typography>
                      <Button 
                        variant="contained" 
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenLinkDialog(campaign.id)}
                      >
                        Add Link
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );

  const renderExplore = () => (
    <Box>
      <Typography variant="h4" component="h2" gutterBottom>
        Available Campaigns
      </Typography>
      
      <Grid container spacing={3}>
        {availableCampaigns.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1">
                There are no available campaigns at the moment. Check back later!
              </Typography>
            </Paper>
          </Grid>
        ) : (
          availableCampaigns.map((campaign, index) => (
            <Grid item xs={12} md={6} key={`available-${campaign.id}-${index}`}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{campaign.name}</Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {campaign.description}
                  </Typography>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <Typography variant="body2">
                    <strong>Budget:</strong> ${campaign.budget}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Brand:</strong> {campaign.ownerName}
                  </Typography>
                  
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button 
                      variant="contained" 
                      size="small"
                      onClick={() => handleApply(campaign.id)}
                      disabled={applyingToCampaignId === campaign.id}
                    >
                      {applyingToCampaignId === campaign.id ? 'Applying...' : 'Apply'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );

  // Issue with Chip component, adding a simple implementation
  const Chip = ({ label }: { label: string }) => (
    <Box
      component="span"
      sx={{
        px: 1,
        py: 0.5,
        bgcolor: 'primary.light',
        color: 'white',
        borderRadius: 1,
        fontSize: '0.8rem',
        mr: 1
      }}
    >
      {label}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h6" noWrap component="div">
            Creator Dashboard
          </Typography>
        </Box>
        <Divider />
        <List>
          <Box
            component={ButtonBase}
            onClick={() => handleTabChange('dashboard')}
            sx={{ 
              width: '100%', 
              textAlign: 'left',
              bgcolor: selectedTab === 'dashboard' ? 'action.selected' : 'transparent'
            }}
          >
            <ListItem>
              <ListItemIcon>
                <WorkHistoryIcon />
              </ListItemIcon>
              <ListItemText primary="My Campaigns" />
            </ListItem>
          </Box>
          <Box
            component={ButtonBase}
            onClick={() => handleTabChange('explore')}
            sx={{ 
              width: '100%', 
              textAlign: 'left',
              bgcolor: selectedTab === 'explore' ? 'action.selected' : 'transparent'
            }}
          >
            <ListItem>
              <ListItemIcon>
                <ExploreIcon />
              </ListItemIcon>
              <ListItemText primary="Explore" />
            </ListItem>
          </Box>
        </List>
      </Drawer>

      {/* Main content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {selectedTab === 'dashboard' ? renderDashboard() : renderExplore()}
      </Box>

      {/* Add Link Dialog */}
      <Dialog open={openLinkDialog} onClose={handleCloseLinkDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleLinkSubmit}>
          <DialogTitle>
            Add Content Link
            <IconButton
              aria-label="close"
              onClick={handleCloseLinkDialog}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Typography variant="body2" sx={{ mb: 2 }}>
              Add a link to your content for this campaign. Supported platforms include Instagram, TikTok, and YouTube.
            </Typography>
            <TextField
              label="Content URL"
              name="url"
              fullWidth
              variant="outlined"
              value={linkData.url}
              onChange={(e) => setLinkData({ ...linkData, url: e.target.value })}
              placeholder="https://www.instagram.com/p/XXXX"
              required
              sx={{ mb: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseLinkDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Adding...' : 'Add Link'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Update Profile Dialog */}
      <Dialog open={openProfileDialog} onClose={handleCloseProfileDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleProfileSubmit}>
          <DialogTitle>
            Update Profile
            <IconButton
              aria-label="close"
              onClick={handleCloseProfileDialog}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <TextField
              margin="dense"
              label="Bio"
              name="bio"
              fullWidth
              variant="outlined"
              multiline
              rows={4}
              value={profileData.bio}
              onChange={handleProfileChange}
              placeholder="Tell brands about yourself..."
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Categories (comma separated)"
              name="categories"
              fullWidth
              variant="outlined"
              value={Array.isArray(profileData.categories) ? profileData.categories.join(', ') : profileData.categories}
              onChange={(e) => setProfileData({
                ...profileData,
                categories: e.target.value.split(',').map(cat => cat.trim())
              })}
              placeholder="e.g., Fashion, Beauty, Tech"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseProfileDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={success}
      />
    </Box>
  );
};

export default CreatorDashboard; 