import { unlink } from 'fs/promises';
import User from '../models/userModel.js';
import Coach from '../models/coachModel.js';
import Branch from '../models/branchModel.js';
import PerformanceMember from '../models/performanceMemberModel.js';

async function deleteBranchCertificateFile(branch) {
    if (!branch?.certificate?.path) return;
    try {
        await unlink(branch.certificate.path);
    } catch (err) {
        console.warn(`Failed to delete certificate file: ${branch.certificate.path}`, err);
    }
}

export async function removeCoachProfileForUser(userId) {
    const user = await User.findById(userId).select('coach').lean();
    if (!user?.coach) return { removed: false };

    const coachId = user.coach;
    const branches = await Branch.find({ coach: coachId });
    for (const branch of branches) {
        await deleteBranchCertificateFile(branch);
    }
    await Branch.deleteMany({ coach: coachId });
    await User.updateMany({ coach: coachId }, { $set: { coach: null } });
    await Coach.findByIdAndDelete(coachId);

    return { removed: true };
}

export async function removePerformanceProfileForUser(userId) {
    const user = await User.findById(userId).select('performanceMember').lean();
    if (!user?.performanceMember) return { removed: false };

    const profile = await PerformanceMember.findById(user.performanceMember);
    if (profile?.certificate?.path) {
        try {
            await unlink(profile.certificate.path);
        } catch (err) {
            console.warn('Failed to delete performance certificate:', err);
        }
    }

    await PerformanceMember.findByIdAndDelete(user.performanceMember);
    await User.findByIdAndUpdate(userId, { $set: { performanceMember: null } });

    return { removed: true };
}
