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
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

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
        const campaignData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
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
        status: 'active'
      };

      await addDoc(collection(db, 'campaigns'), campaign);
      setSuccess(true);
      handleClose();
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
                {campaign.socialMediaLinks?.length > 0 ? (
                  <Grid container spacing={2}>
                    {campaign.socialMediaLinks.map((link, index) => (
                      <Grid item xs={12} key={index}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <ShareIcon sx={{ mr: 1 }} />
                            <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                              {link.platform}
                            </Typography>
                          </Box>
                          <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                            {link.link}
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
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  autoFocus
                  required
                  name="name"
                  label="Campaign Name"
                  fullWidth
                  value={campaignData.name}
                  onChange={handleChange}
                  error={!!error && error.includes('name')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  name="budget"
                  label="Budget"
                  type="number"
                  fullWidth
                  value={campaignData.budget}
                  onChange={handleChange}
                  error={!!error && error.includes('budget')}
                  InputProps={{
                    startAdornment: '$',
                    inputProps: { min: 0 }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  name="description"
                  label="Description"
                  multiline
                  rows={4}
                  fullWidth
                  value={campaignData.description}
                  onChange={handleChange}
                  error={!!error && error.includes('description')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="logoUrl"
                  label="Logo URL"
                  fullWidth
                  value={campaignData.logoUrl}
                  onChange={handleChange}
                  helperText="Enter the URL of your campaign logo (optional)"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={loading}
            >
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          Campaign created successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
} 