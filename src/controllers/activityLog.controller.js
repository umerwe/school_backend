import { ActivityLog } from '../models/activityLog.model.js';

// GET /api/v1/activity/log
export const getActivityLog = async (req, res) => {
    try {
        const instituteId = req.user._id;

        // Fetch recent activities (last 10)
        const activities = await ActivityLog.find({ instituteId })
            .sort({ date: -1 })
            .limit(10)
            .select('action date details');

        // Format response for frontend
        const formattedActivities = activities.map(activity => ({
            action: activity.action,
            date: new Date(activity.date).toLocaleDateString(),
            details: activity.details || ''
        }));

        res.json({
            data: formattedActivities,
            message: 'Activity log retrieved'
        });
    } catch (error) {
        console.error('Activity Log Error:', error);
        res.status(500).json({ error: 'Failed to fetch activity log' });
    }
};

// Helper function to log activities (call in other controllers)
export const logActivity = async (instituteId, action, details) => {
    try {
        const activity = new ActivityLog({
            instituteId,
            action,
            details
        });
        await activity.save();
    } catch (error) {
        console.error('Error logging activity:', error);
    }
};