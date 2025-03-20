import React, { useState, useEffect } from 'react';
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
  CircularProgress
} from '@mui/material';
import {
  Explore as ExploreIcon,
  WorkHistory as WorkHistoryIcon,
  Share as ShareIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { refreshCampaignSocialMediaStats } from '../services/campaignStatsService';
import { extractPlatformFromUrl, extractPostIdFromUrl } from '../utils/socialMediaUtils';

const drawerWidth = 240;

export default function CreatorDashboard() {
  const [selectedMenu, setSelectedMenu] = useState('explore');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [joiningCampaign, setJoiningCampaign] = useState(null);
  const { currentUser, userRole } = useAuth();
  const [refreshingStats, setRefreshingStats] = useState(false);
  const [socialMediaDialog, setSocialMediaDialog] = useState({ open: false, campaignId: null });
  const [socialMediaLink, setSocialMediaLink] = useState({ platform: '', link: '' });
  const [socialMediaError, setSocialMediaError] = useState('');

  const menuItems = [
    { text: 'Explore Campaigns', icon: <ExploreIcon />, value: 'explore' },
    { text: 'My Campaigns', icon: <WorkHistoryIcon />, value: 'myCampaigns' }
  ];

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        let q;
        
        if (selectedMenu === 'explore') {
          // For explore, show all active campaigns
          q = query(
            collection(db, 'campaigns'),
            where('status', '==', 'active')
          );
        } else {
          // For my campaigns, show only campaigns where the creator is participating
          q = query(
            collection(db, 'campaigns'),
            where('participants', 'array-contains', currentUser.uid)
          );
        }

        const querySnapshot = await getDocs(q);
        const campaignData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCampaigns(campaignData);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [selectedMenu, currentUser.uid]);

  const handleJoinCampaign = async (campaignId) => {
    try {
      setJoiningCampaign(campaignId);
      setError(null);
      
      // Debug user authentication state
      console.log('Current User:', currentUser);
      console.log('User Role:', userRole);
      
      if (!currentUser) {
        setError('You must be logged in to join a campaign');
        return;
      }

      if (userRole !== 'creator') {
        setError('Only creator accounts can join campaigns');
        return;
      }

      // Check if campaign exists and get current data
      const campaignRef = doc(db, 'campaigns', campaignId);
      const campaignSnap = await getDoc(campaignRef);
      
      console.log('Campaign Data:', campaignSnap.exists() ? campaignSnap.data() : 'No campaign document');
      
      if (!campaignSnap.exists()) {
        setError('Campaign not found');
        return;
      }

      const campaignData = campaignSnap.data();
      const currentParticipants = campaignData.participants || [];
      
      console.log('Current Participants:', currentParticipants);
      console.log('Attempting to add user:', currentUser.uid);
      
      if (currentParticipants.includes(currentUser.uid)) {
        setError('You have already joined this campaign');
        return;
      }

      // Create a new participants array with the current user added
      const newParticipants = [...currentParticipants, currentUser.uid];
      console.log('New participants array:', newParticipants);
      
      // Update the campaign document with the new participants array
      await updateDoc(campaignRef, {
        participants: newParticipants
      });
      
      setSuccess('Successfully joined the campaign!');
      
      // Refresh the campaigns list
      setSelectedMenu(prev => prev); // This will trigger the useEffect
    } catch (error) {
      console.error('Error joining campaign:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      if (error.code === 'permission-denied') {
        setError('You do not have permission to join this campaign. Please ensure you are logged in with a creator account.');
      } else {
        setError(`Failed to join campaign: ${error.message}`);
      }
    } finally {
      setJoiningCampaign(null);
    }
  };

  const handleAddSocialMedia = (campaignId) => {
    setSocialMediaDialog({ open: true, campaignId });
    setSocialMediaLink({ platform: '', link: '' });
    setSocialMediaError('');
  };

  const handleCloseSocialMedia = () => {
    setSocialMediaDialog({ open: false, campaignId: null });
    setSocialMediaLink({ platform: '', link: '' });
    setSocialMediaError('');
  };

  const handleSocialMediaSubmit = async (e) => {
    e.preventDefault();
    setSocialMediaError('');

    try {
      // Validate the URL first
      const platform = extractPlatformFromUrl(socialMediaLink.link);
      const postId = extractPostIdFromUrl(socialMediaLink.link, platform);
      
      if (!platform) {
        setSocialMediaError('Invalid platform. Please use Instagram, TikTok, or YouTube links.');
        return;
      }
      
      if (!postId) {
        setSocialMediaError('Invalid URL format. Please check your link and try again.');
        return;
      }

      const campaignRef = doc(db, 'campaigns', socialMediaDialog.campaignId);
      const socialMediaData = {
        platform,
        link: socialMediaLink.link,
        createdAt: new Date(),
        stats: {
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          lastUpdated: new Date()
        }
      };

      await updateDoc(campaignRef, {
        socialMediaLinks: arrayUnion(socialMediaData)
      });

      // Update local state
      setCampaigns(prevCampaigns => 
        prevCampaigns.map(campaign => 
          campaign.id === socialMediaDialog.campaignId
            ? {
                ...campaign,
                socialMediaLinks: [...(campaign.socialMediaLinks || []), socialMediaData]
              }
            : campaign
        )
      );

      handleCloseSocialMedia();
      setSuccess('Social media link added successfully!');
    } catch (error) {
      setSocialMediaError('Failed to add social media link: ' + error.message);
    }
  };

  const handleRefreshStats = async (campaign) => {
    try {
      setRefreshingStats(true);
      await refreshCampaignSocialMediaStats(campaign);
      setSuccess('Social media stats updated successfully!');
      // Refresh campaigns
      setSelectedMenu(prev => prev);
    } catch (error) {
      setError('Failed to update social media stats: ' + error.message);
    } finally {
      setRefreshingStats(false);
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Side Panel */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ overflow: 'auto', mt: 8 }}>
          <List>
            {menuItems.map((item) => (
              <ListItem
                key={item.value}
                selected={selectedMenu === item.value}
                onClick={() => setSelectedMenu(item.value)}
                sx={{ cursor: 'pointer' }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Paper sx={{ p: 3, mb: 3, mt: 8 }}>
          <Typography variant="h4">
            {selectedMenu === 'explore' ? 'Available Campaigns' : 'My Campaigns'}
          </Typography>
        </Paper>

        {loading ? (
          <Typography>Loading campaigns...</Typography>
        ) : campaigns.length === 0 ? (
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            {selectedMenu === 'explore' 
              ? 'No campaigns available at the moment.'
              : 'You haven\'t joined any campaigns yet.'}
          </Typography>
        ) : (
          <Grid container spacing={3}>
            {campaigns.map((campaign) => (
              <Grid item xs={12} sm={6} md={4} key={campaign.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {campaign.logoUrl && (
                    <CardMedia
                      component="img"
                      height="140"
                      image={campaign.logoUrl}
                      alt={campaign.name}
                      sx={{ objectFit: 'contain', p: 1 }}
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h5" component="h2">
                      {campaign.name}
                    </Typography>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      Budget: ${campaign.budget}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      {campaign.description}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Posted by: {campaign.brandName}
                    </Typography>

                    {/* Social Media Links Section */}
                    {campaign.participants?.includes(currentUser.uid) && (
                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2">
                            Social Media Links
                          </Typography>
                          <Button
                            size="small"
                            startIcon={refreshingStats ? <CircularProgress size={16} /> : <RefreshIcon />}
                            onClick={() => handleRefreshStats(campaign)}
                            disabled={refreshingStats}
                          >
                            Refresh Stats
                          </Button>
                        </Box>
                        {campaign.socialMediaLinks?.map((link, index) => (
                          <Box key={index} sx={{ mb: 1 }}>
                            <Typography variant="caption" display="block">
                              {link.platform}: {link.link}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Views: {link.stats.views} | Likes: {link.stats.likes}
                              {link.stats.comments !== undefined && ` | Comments: ${link.stats.comments}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Last updated: {link.stats.lastUpdated?.toDate 
                                ? new Date(link.stats.lastUpdated.toDate()).toLocaleString()
                                : new Date(link.stats.lastUpdated).toLocaleString()}
                            </Typography>
                          </Box>
                        ))}
                        <Button
                          size="small"
                          startIcon={<ShareIcon />}
                          onClick={() => handleAddSocialMedia(campaign.id)}
                          sx={{ mt: 1 }}
                        >
                          Add Social Media Link
                        </Button>
                      </Box>
                    )}

                    {selectedMenu === 'explore' && (
                      <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        sx={{ mt: 2 }}
                        onClick={() => handleJoinCampaign(campaign.id)}
                        disabled={joiningCampaign === campaign.id || campaign.participants?.includes(currentUser.uid)}
                      >
                        {campaign.participants?.includes(currentUser.uid) 
                          ? 'Already Joined' 
                          : joiningCampaign === campaign.id 
                            ? 'Joining...' 
                            : 'Join Campaign'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Social Media Dialog */}
        <Dialog open={socialMediaDialog.open} onClose={handleCloseSocialMedia} maxWidth="sm" fullWidth>
          <DialogTitle>
            Add Social Media Link
            <IconButton
              aria-label="close"
              onClick={handleCloseSocialMedia}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <form onSubmit={handleSocialMediaSubmit}>
            <DialogContent>
              {socialMediaError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {socialMediaError}
                </Alert>
              )}
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    select
                    required
                    fullWidth
                    label="Platform"
                    value={socialMediaLink.platform}
                    onChange={(e) => setSocialMediaLink(prev => ({ ...prev, platform: e.target.value }))}
                  >
                    <MenuItem value="">Select a platform</MenuItem>
                    <MenuItem value="instagram">Instagram</MenuItem>
                    <MenuItem value="tiktok">TikTok</MenuItem>
                    <MenuItem value="twitter">X (Twitter)</MenuItem>
                    <MenuItem value="youtube">YouTube</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    label="Link"
                    value={socialMediaLink.link}
                    onChange={(e) => setSocialMediaLink(prev => ({ ...prev, link: e.target.value }))}
                    placeholder="https://..."
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseSocialMedia}>Cancel</Button>
              <Button type="submit" variant="contained">
                Add Link
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Error and Success Messages */}
        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!success}
          autoHideDuration={6000}
          onClose={() => setSuccess(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>
            {success}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
} 