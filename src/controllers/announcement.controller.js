import { Announcement } from '../models/announcements.js';
import { Teacher } from '../models/teacher.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Student } from '../models/student.model.js';
import { Parent } from '../models/parent.model.js';
import { ActivityLog } from '../models/activityLog.model.js';


// Admin creates an announcement
export const createAnnouncement = asyncHandler(async (req, res) => {
    const instituteId = req.user._id;
    const { title, message, audience } = req.body;

    if (!title || !message || !audience) {
      throw new ApiError(400, "Title, message, and audience are required.");
    }

    // Validate audience type
    const validAudiences = [
      'all',
      'teachers',
      'students',
      'parents',
      'students_parents',
      'teachers_parents'
    ];

    if (!validAudiences.includes(audience)) {
      throw new ApiError(400, "Invalid audience type specified.");
    }

    // Update announcement counters based on audience
    try {
      if (audience === 'teachers' || audience === 'all' || audience === 'teachers_parents') {
        await Teacher.updateMany({ instituteId }, { $inc: { number: 1 } });
      }
      if (audience === 'students' || audience === 'all' || audience === 'students_parents') {
        await Student.updateMany({ instituteId }, { $inc: { number: 1 } });
      }
      if (audience === 'parents' || audience === 'all' || audience === 'students_parents' || audience === 'teachers_parents') {
        await Parent.updateMany({ instituteId }, { $inc: { number: 1 } });
      }
    } catch (updateError) {
      console.error("Error updating announcement counters:", updateError);
    }

    const newAnnouncement = await Announcement.create({
      title,
      message,
      audience,
      instituteId
    });

    await ActivityLog.create({
      instituteId,
      action: `Announcement Created for: ${audience}`,
    });

    return res.status(201).json(
      new ApiResponse(201, newAnnouncement, "Announcement sent successfully")
    );
});

export const getAllAnnouncements = asyncHandler(async (req, res) => {
    const instituteId = req.user._id;

    const announcements = await Announcement.find({ instituteId })
      .sort({ createdAt: -1 })
      .select('title message createdAt audience');

    return res.status(200).json(
      new ApiResponse(200, announcements, 'All announcements fetched successfully')
    );
});

export const getAnnouncementsForRole = asyncHandler(async (req, res) => {
  const { role } = req.params;
  const instituteId = req.user.instituteId;

  if (!["students", "teachers", "parents"].includes(role)) {
    throw new ApiError(400, "Invalid role specified");
  }

  const announcements = await Announcement.find({
    instituteId, // Filter by institute
    $or: [
      { audience: role }, // Exact match for role
      { audience: "all" }, // Match for all
      { audience: { $regex: role, $options: "i" } }, // Match role in combined audience (e.g., "students_parents")
    ],
  }).sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, announcements, "Announcements fetched successfully")
  );
});


