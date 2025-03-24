import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  IconButton,
  Paper,
  Grid,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon, Share as ShareIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export default function BrandDashboard() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignData, setCampaignData] = useState({
    name: '',
    budget: '',
    description: '',
    logoUrl: ''
  });
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const q = query(
          collection(db, 'campaigns'),
          where('brandId', '==', currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        const campaignData = await Promise.all(querySnapshot.docs.map(async (doc) => {
          const campaign = { id: doc.id, ...doc.data() };
          
          // Fetch links for each campaign
          const linksRef = collection(db, 'campaigns', doc.id, 'links');
          const linksSnapshot = await getDocs(linksRef);
          campaign.links = linksSnapshot.docs.map(linkDoc => ({
            id: linkDoc.id,
            ...linkDoc.data()
          }));
          
          return campaign;
        }));
        setCampaigns(campaignData);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      }
    };

    fetchCampaigns();
  }, [currentUser.uid]);

  const handleClickOpen = () => {
    setOpen(true);
    setError('');
  };

  const handleClose = () => {
    setOpen(false);
    setError('');
    setCampaignData({
      name: '',
      budget: '',
      description: '',
      logoUrl: ''
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCampaignData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!campaignData.name.trim()) {
      setError('Campaign name is required');
      return false;
    }
    if (!campaignData.budget || campaignData.budget <= 0) {
      setError('Please enter a valid budget amount');
      return false;
    }
    if (!campaignData.description.trim()) {
      setError('Campaign description is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const campaign = {
        ...campaignData,
        budget: Number(campaignData.budget),
        brandId: currentUser.uid,
        brandName: currentUser.displayName || 'Anonymous Brand',
        createdAt: new Date().toISOString(),
        status: 'active',
        creators: [] // Initialize empty creators array
      };

      await addDoc(collection(db, 'campaigns'), campaign);
      setSuccess(true);
      handleClose();
      
      // Refresh campaigns list
      const q = query(
        collection(db, 'campaigns'),
        where('brandId', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const campaignData = await Promise.all(querySnapshot.docs.map(async (doc) => {
        const campaign = { id: doc.id, ...doc.data() };
        
        // Fetch links for each campaign
        const linksRef = collection(db, 'campaigns', doc.id, 'links');
        const linksSnapshot = await getDocs(linksRef);
        campaign.links = linksSnapshot.docs.map(linkDoc => ({
          id: linkDoc.id,
          ...linkDoc.data()
        }));
        
        return campaign;
      }));
      setCampaigns(campaignData);
    } catch (error) {
      console.error('Error creating campaign:', error);
      setError(
        error.code === 'permission-denied' 
          ? 'You do not have permission to create campaigns. Please make sure you are logged in as a brand account.'
          : 'Failed to create campaign. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Brand Dashboard</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleClickOpen}
          >
            Add Campaign
          </Button>
        </Box>
      </Paper>

      {/* Campaigns Grid */}
      <Grid container spacing={3}>
        {campaigns.map((campaign) => (
          <Grid item xs={12} md={6} key={campaign.id}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  {campaign.name}
                </Typography>
                <Typography variant="subtitle1" color="primary" gutterBottom>
                  Budget: ${campaign.budget}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {campaign.description}
                </Typography>
                <Divider sx={{ my: 2 }} />
                
                {/* Social Media Stats */}
                <Typography variant="subtitle2" gutterBottom>
                  Social Media Performance
                </Typography>
                {campaign.links && campaign.links.length > 0 ? (
                  <Grid container spacing={2}>
                    {campaign.links.map((link) => (
                      <Grid item xs={12} key={link.id}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <ShareIcon sx={{ mr: 1 }} />
                            <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                              {link.platform}
                            </Typography>
                          </Box>
                          <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                            {link.url}
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <Typography variant="h6" color="primary">
                                {link.stats.views.toLocaleString()}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Views
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="h6" color="primary">
                                {link.stats.likes.toLocaleString()}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Likes
                              </Typography>
                            </Grid>
                          </Grid>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                            Last updated: {new Date(link.stats.lastUpdated.toDate()).toLocaleString()}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No social media links added yet.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Campaign Creation Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          Create New Campaign
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <TextField
              required
              fullWidth
              label="Campaign Name"
              name="name"
              value={campaignData.name}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <TextField
              required
              fullWidth
              label="Budget"
              name="budget"
              type="number"
              value={campaignData.budget}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <TextField
              required
              fullWidth
              label="Description"
              name="description"
              multiline
              rows={4}
              value={campaignData.description}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Logo URL (optional)"
              name="logoUrl"
              value={campaignData.logoUrl}
              onChange={handleChange}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Creating...' : 'Create Campaign'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Success Message */}
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccess(false)} severity="success" sx={{ width: '100%' }}>
          Campaign created successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
} 