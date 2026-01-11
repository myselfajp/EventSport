import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// Import models
import User from './src/models/userModel.js';
import Event from './src/models/eventModel.js';
import { EventStyle, SportGroup, Sport } from './src/models/referenceDataModel.js';
import Facility from './src/models/facilityModel.js';

const connectDB = async () => {
    try {
        // Use MONGODB_URI from environment (set in docker-compose)
        const mongoURI = process.env.MONGODB_URI || 
                        process.env.MONGO_URI || 
                        'mongodb://mongodb:27017/eventSport';
        await mongoose.connect(mongoURI);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

const createDummyBannerFile = () => {
    // Create a dummy banner file path
    const uploadsDir = path.join(__dirname, 'uploads', 'banner');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const dummyBannerPath = path.join(uploadsDir, 'dummy-banner.jpg');
    // Create a minimal dummy file (1x1 pixel JPEG)
    const dummyImage = Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A',
        'base64'
    );
    
    if (!fs.existsSync(dummyBannerPath)) {
        fs.writeFileSync(dummyBannerPath, dummyImage);
    }
    
    return {
        path: `banner/dummy-banner.jpg`,
        originalName: 'dummy-banner.jpg',
        mimeType: 'image/jpeg',
        size: dummyImage.length
    };
};

const createDummyEvents = async () => {
    try {
        await connectDB();

        // Check or create EventStyle
        let eventStyle = await EventStyle.findOne({ name: 'Dummy Style' });
        if (!eventStyle) {
            eventStyle = await EventStyle.create({
                name: 'Dummy Style',
                color: '#3b82f6'
            });
            console.log('Created EventStyle:', eventStyle._id);
        } else {
            console.log('Using existing EventStyle:', eventStyle._id);
        }

        // Check or create SportGroup
        let sportGroup = await SportGroup.findOne({ name: 'Dummy Sport Group' });
        if (!sportGroup) {
            sportGroup = await SportGroup.create({
                name: 'Dummy Sport Group',
                description: 'Dummy sport group for testing'
            });
            console.log('Created SportGroup:', sportGroup._id);
        } else {
            console.log('Using existing SportGroup:', sportGroup._id);
        }

        // Check or create Sport
        let sport = await Sport.findOne({ name: 'Dummy Sport' });
        if (!sport) {
            sport = await Sport.create({
                name: 'Dummy Sport',
                group: sportGroup._id,
                groupName: sportGroup.name,
                icon: {
                    path: 'icon/dummy-icon.png',
                    originalName: 'dummy-icon.png',
                    mimeType: 'image/png',
                    size: 1024
                }
            });
            console.log('Created Sport:', sport._id);
        } else {
            console.log('Using existing Sport:', sport._id);
        }

        // Find a coach user
        const coachUser = await User.findOne({ coach: { $exists: true } });
        if (!coachUser) {
            console.error('No coach user found. Please create a coach user first.');
            process.exit(1);
        }
        console.log('Using Coach User:', coachUser._id);

        // Find or create a facility
        let facility = await Facility.findOne();
        if (!facility) {
            // Create a dummy photo for facility (required field)
            const facilityPhotoMeta = {
                path: 'facility-photo/dummy-facility.jpg',
                originalName: 'dummy-facility.jpg',
                mimeType: 'image/jpeg',
                size: 1024
            };
            
            facility = await Facility.create({
                name: 'Dummy Facility',
                address: '123 Dummy Street',
                phone: '1234567890',
                email: 'dummy@facility.com',
                mainSport: sport._id,
                membershipLevel: 'Gold',
                photo: facilityPhotoMeta
            });
            console.log('Created Facility:', facility._id);
        } else {
            console.log('Using existing Facility:', facility._id);
        }

        // Create dummy banner file metadata
        const bannerMeta = createDummyBannerFile();

        // Event names
        const eventNames = [
            'Basketball Tournament',
            'Soccer Championship',
            'Tennis Training',
            'Swimming Competition',
            'Volleyball Match',
            'Badminton Session',
            'Table Tennis Tournament',
            'Basketball Practice',
            'Soccer Training',
            'Tennis Match',
            'Swimming Lesson',
            'Volleyball Training',
            'Badminton Tournament',
            'Table Tennis Practice',
            'Fitness Class'
        ];

        const eventTypes = ['Indoor', 'Outdoor', 'Online'];
        const priceTypes = ['Free', 'Stable', 'Manual'];
        
        // Create 15 events
        const events = [];
        const now = new Date();
        
        for (let i = 0; i < 15; i++) {
            const startTime = new Date(now);
            startTime.setDate(startTime.getDate() + i);
            startTime.setHours(10 + (i % 8), 0, 0, 0);
            
            const endTime = new Date(startTime);
            endTime.setHours(startTime.getHours() + 2);
            
            const event = {
                owner: coachUser._id,
                name: eventNames[i],
                style: eventStyle._id,
                eventStyle: {
                    name: eventStyle.name,
                    color: eventStyle.color
                },
                sportGroup: sportGroup._id,
                sport: sport._id,
                startTime: startTime,
                endTime: endTime,
                capacity: 10 + (i % 20),
                level: 1 + (i % 10),
                type: eventTypes[i % eventTypes.length],
                priceType: priceTypes[i % priceTypes.length],
                participationFee: priceTypes[i % priceTypes.length] === 'Free' ? 0 : 10000 + (i * 1000),
                private: i % 3 === 0,
                isRecurring: i % 2 === 0,
                equipment: `Equipment for ${eventNames[i]}`,
                facility: facility._id,
                banner: bannerMeta
            };

            events.push(event);
        }

        // Insert events
        const createdEvents = await Event.insertMany(events);
        console.log(`\n✅ Successfully created ${createdEvents.length} dummy events!`);
        
        createdEvents.forEach((event, index) => {
            console.log(`${index + 1}. ${event.name} - ${event.startTime.toLocaleDateString()}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error creating dummy events:', error);
        process.exit(1);
    }
};

createDummyEvents();

