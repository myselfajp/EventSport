import User from '../models/userModel.js';
import argon2 from 'argon2';

/**
 * Initialize admin user on application startup
 * Creates admin user if it doesn't exist based on environment variables
 */
export const initAdmin = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        const adminFirstName = process.env.ADMIN_FIRST_NAME;
        const adminLastName = process.env.ADMIN_LAST_NAME;
        const adminPhone = process.env.ADMIN_PHONE;
        const adminAge = process.env.ADMIN_AGE;

        // Check if all required environment variables are set
        if (!adminEmail || !adminPassword || !adminFirstName || !adminLastName || !adminPhone || !adminAge) {
            console.log('⚠️  Admin user environment variables not set. Skipping admin user creation.');
            return;
        }

        // Check if admin user already exists
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            console.log(`✅ Admin user already exists: ${adminEmail}`);
            return;
        }

        // Hash password
        const hashedPassword = await argon2.hash(adminPassword);

        // Parse age date
        const ageDate = new Date(adminAge);

        // Create admin user with role 0 (admin)
        const adminUser = await User.create({
            email: adminEmail,
            password: hashedPassword,
            firstName: adminFirstName,
            lastName: adminLastName,
            phone: adminPhone,
            age: ageDate,
            role: 0, // Admin role
            isEmailVerified: true,
            isPhoneVerified: true,
        });

        console.log(`✅ Admin user created successfully: ${adminEmail}`);
        console.log(`   Name: ${adminFirstName} ${adminLastName}`);
        console.log(`   Role: Admin (0)`);
    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        // Don't throw error to prevent app from crashing
        // Admin can be created manually if needed
    }
};

