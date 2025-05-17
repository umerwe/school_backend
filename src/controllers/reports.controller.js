import { Parent } from "../models/parent.model.js";
import { Report } from "../models/report.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const addCommentToReport = asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    const { message } = req.body;
    const { _id: userId, role } = req.user;

    // Validate input
    if (!message?.trim()) {
        throw new ApiError(400, 'Comment message is required');
    }

    // Restrict to admins only
    if (role !== 'admin') {
        throw new ApiError(403, 'Only admins can comment on reports');
    }

    // Find the report
    const report = await Report.findById(reportId);
    if (!report) {
        throw new ApiError(404, 'Report not found');
    }

    report.status = "resolved"
    // Add comment to report
    report.comments.push({
        author: 'admin',
        message: message.trim(),
        createdAt: new Date(),
    });
    await report.save();

    const parent = await Parent.findById(report.parent);
    if (!parent) {
        throw new ApiError(404, 'Parent not found');
    }
    parent.reportCommentsNumber = (parent.reportCommentsNumber || 0) + 1;
    await parent.save();

    return res.status(200).json(
        new ApiResponse(200, report.comments, 'Comment added successfully')
    );
});

export const getReportComments = asyncHandler(async (req, res) => {
    const { reportId } = req.params;

    const report = await Report.findById(reportId).select('comments');

    if (!report) {
        throw new ApiError(404, 'Report not found');
    }

    return res.status(200).json(
        new ApiResponse(200, report.comments, 'Comments retrieved successfully')
    );
});