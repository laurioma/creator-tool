import React, { useState, useEffect, FormEvent } from 'react';
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
import { collection, addDoc, query, where, getDocs, doc, getDoc, DocumentData } from 'firebase/firestore';

interface Campaign {
  id: string;
  name: string;
  description: string;
  budget: number;
  creatorRequirements: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  brandId: string;
  ownerName: string;
  [key: string]: any;
}

interface CampaignFormData {
  name: string;
  description: string;
  budget: string;
  creatorRequirements: string;
}

const BrandDashboard: React.FC = () => {
  const [open, setOpen] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignData, setCampaignData] = useState<CampaignFormData>({
    name: '',
    description: '',
    budget: '',
    creatorRequirements: ''
  });

  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      fetchCampaigns();
    }
  }, [currentUser]);

  const fetchCampaigns = async () => {
    try {
      if (!currentUser) return;

      setLoading(true);
      const campaignsRef = collection(db, 'campaigns');
      const q = query(campaignsRef, where('brandId', '==', currentUser.uid));
      const snapshot = await getDocs(q);

      const campaignsList: Campaign[] = [];
      snapshot.docs.forEach((doc) => {
        const data = doc.data() as DocumentData;
        campaignsList.push({
          id: doc.id,
          ...data
        } as Campaign);
      });

      setCampaigns(campaignsList);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      setError('Failed to load your campaigns. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    // Reset form data
    setCampaignData({
      name: '',
      description: '',
      budget: '',
      creatorRequirements: ''
    });
    setError('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCampaignData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateCampaign = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      if (!currentUser) {
        setError('You must be logged in to create a campaign');
        return;
      }

      // Validate form
      if (!campaignData.name.trim()) {
        setError('Campaign name is required');
        return;
      }

      if (isNaN(parseFloat(campaignData.budget)) || parseFloat(campaignData.budget) <= 0) {
        setError('Please enter a valid budget amount');
        return;
      }

      setLoading(true);
      setError('');

      // Create campaign in Firestore
      const campaignRef = await addDoc(collection(db, 'campaigns'), {
        name: campaignData.name,
        description: campaignData.description,
        budget: parseFloat(campaignData.budget),
        creatorRequirements: campaignData.creatorRequirements,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        brandId: currentUser.uid,
        ownerName: currentUser.displayName || 'Anonymous'
      });

      // Close dialog and show success message
      handleClose();
      setSuccess(true);
      
      // Refresh campaigns list
      fetchCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      setError('Failed to create campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSuccess(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Brand Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleClickOpen}
          disabled={loading}
        >
          Create Campaign
        </Button>
      </Box>

      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Campaigns list */}
      <Grid container spacing={3}>
        {campaigns.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1">
                You haven't created any campaigns yet. Click the "Create Campaign" button to get started.
              </Typography>
            </Paper>
          </Grid>
        ) : (
          campaigns.map((campaign) => (
            <Grid item xs={12} md={6} lg={4} key={campaign.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {campaign.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {campaign.description}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2">
                    <strong>Budget:</strong> ${campaign.budget}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Status:</strong> {campaign.status}
                  </Typography>
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      startIcon={<ShareIcon />}
                      onClick={() => {/* Share campaign logic */}}
                    >
                      Share
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* Create Campaign Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreateCampaign}>
          <DialogTitle>
            Create a New Campaign
            <IconButton
              aria-label="close"
              onClick={handleClose}
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
              label="Campaign Name"
              name="name"
              fullWidth
              variant="outlined"
              value={campaignData.name}
              onChange={handleChange}
              required
            />
            <TextField
              margin="dense"
              label="Description"
              name="description"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={campaignData.description}
              onChange={handleChange}
            />
            <TextField
              margin="dense"
              label="Budget ($)"
              name="budget"
              type="number"
              fullWidth
              variant="outlined"
              value={campaignData.budget}
              onChange={handleChange}
              required
            />
            <TextField
              margin="dense"
              label="Creator Requirements"
              name="creatorRequirements"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={campaignData.creatorRequirements}
              onChange={handleChange}
              placeholder="Describe what you're looking for in creators..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              Create
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message="Campaign created successfully!"
      />
    </Box>
  );
};

export default BrandDashboard; 