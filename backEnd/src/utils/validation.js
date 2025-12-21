import { z } from 'zod';

const passwordMin = 8;
const passwordMax = 50;
const hexRegex = /^#([0-9A-F]{6}|[0-9A-F]{3})$/i;
const MongoObjectIdRegex = /^[a-fA-F\d]{24}$/;

export const name = z.string({
    error: (iss) => (iss.input === undefined ? 'name is required.' : 'Invalid name.'),
});

export const color = z
    .string({
        error: (iss) => (iss.input === undefined ? 'Color is required.' : 'Invalid color hex.'),
    })
    .regex(hexRegex, 'Provide a valid color hex.');

export const mongoObjectId = z
    .string({ error: (iss) => (iss.input === undefined ? 'ID is required.' : 'Invalid ID.') })
    .regex(MongoObjectIdRegex, 'Provide a valid ID.');

export const coachId = z
    .string({
        error: (iss) => (iss.input === undefined ? 'Coach ID is required.' : 'Invalid Coach ID.'),
    })
    .regex(MongoObjectIdRegex, 'Invalid Coach ID.');

export const clubId = z
    .string({
        error: (iss) => (iss.input === undefined ? 'Club ID is required.' : 'Invalid Club ID.'),
    })
    .regex(MongoObjectIdRegex, 'Invalid Club ID.');

export const companyId = z
    .string({
        error: (iss) =>
            iss.input === undefined ? 'Company ID is required.' : 'Invalid Company ID.',
    })
    .regex(MongoObjectIdRegex, 'Invalid Company ID.');

export const facilityId = z
    .string({
        error: (iss) =>
            iss.input === undefined ? 'facility ID is required.' : 'Invalid facility ID.',
    })
    .regex(MongoObjectIdRegex, 'Invalid facility ID.');

export const eventId = z
    .string({
        error: (iss) => (iss.input === undefined ? 'event ID is required.' : 'Invalid event ID.'),
    })
    .regex(MongoObjectIdRegex, 'Invalid event ID.');

export const point = z
    .number({ error: (iss) => (iss.input === undefined ? 'point is required.' : 'Invalid point.') })
    .min(1, 'point must be at least 1')
    .max(10, 'point must be at most 10');
// Objects

export const signupSchema = z.object({
    firstName: z.string({
        error: (iss) =>
            iss.input === undefined
                ? { message: 'First name is required.' }
                : { message: 'Invalid first name.' },
    }),

    lastName: z.string({
        error: (iss) =>
            iss.input === undefined
                ? { message: 'Last name is required.' }
                : { message: 'Invalid last name.' },
    }),

    phone: z.string({
        error: (iss) =>
            iss.input === undefined
                ? { message: 'Phone is required.' }
                : { message: 'Invalid phone number.' },
    }),

    email: z
        .string({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'Email is required.' }
                    : { message: 'Invalid input.' },
        })
        .email('Please provide a valid email address'),

    password: z
        .string({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'Password is required.' }
                    : { message: 'Invalid input.' },
        })
        .min(passwordMin, `Password must be at least ${passwordMin} characters`)
        .max(passwordMax, `Password must be at most ${passwordMax} characters`),

    age: z.date({
        error: (iss) =>
            iss.input === undefined ? { message: 'Age is required.' } : { message: 'Invalid age.' },
    }),
});

export const loginSchema = z.object({
    email: z
        .string({
            error: (iss) => (iss.input === undefined ? 'Email is required.' : 'Invalid input.'),
        })
        .email('Please provide a valid email address'),

    password: z
        .string({
            error: (iss) => (iss.input === undefined ? 'Password is required.' : 'Invalid input.'),
        })
        .min(passwordMin, `Password must be at least ${passwordMin} characters`)
        .max(passwordMax, `Password must be at most ${passwordMax} characters`),
});

export const editUserSchema = z
    .object({
        firstName: z
            .string({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'First name is required.' }
                        : { message: 'Invalid first name.' },
            })
            .optional(),
        lastName: z
            .string({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'Last name is required.' }
                        : { message: 'Invalid last name.' },
            })
            .optional(),
        phone: z
            .string({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'Phone is required.' }
                        : { message: 'Invalid phone number.' },
            })
            .optional(),
        email: z
            .string({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'Email is required.' }
                        : { message: 'Invalid email.' },
            })
            .email('Provide a valid email address.')
            .optional(),
        age: z
            .date({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'Age is required.' }
                        : { message: 'Invalid age.' },
            })
            .optional(),
        photo: z
            .string({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'photo is required.' }
                        : { message: 'Invalid input.' },
            })
            .optional(),
        newPassword: z
            .string({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'New password is required.' }
                        : { message: 'Invalid input.' },
            })
            .min(passwordMin, `New password must be at least ${passwordMin} characters`)
            .max(passwordMax, `New password must be at most ${passwordMax} characters`)
            .optional(),
        oldPassword: z
            .string({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'Old password is required.' }
                        : { message: 'Invalid input.' },
            })
            .min(passwordMin, `Old password must be at least ${passwordMin} characters`)
            .max(passwordMax, `Old password must be at most ${passwordMax} characters`)
            .optional(),
    })
    .refine(
        (data) =>
            data.firstName !== undefined ||
            data.lastName !== undefined ||
            data.phone !== undefined ||
            data.email !== undefined ||
            data.age !== undefined ||
            data.photo !== undefined ||
            data.newPassword !== undefined ||
            data.oldPassword !== undefined,
        {
            message:
                'At least one of first name, last name, phone, email, age, photo, new password, old password must be provided.',
            path: [], // set to [] to attach error to the global object
        }
    );

export const createParticipantSchema = z.object({
    mainSport: z
        .string({
            error: (iss) =>
                iss.input === undefined ? 'Main sport is required.' : 'Invalid main sport ID.',
        })
        .regex(MongoObjectIdRegex, 'Main sport must be a valid ID'),

    skillLevel: z
        .number({
            error: (iss) =>
                iss.input === undefined ? 'Skill level is required.' : 'Invalid skill level.',
        })
        .min(1, 'Skill level must be at least 1')
        .max(10, 'Skill level must be at most 10'),

    sportGoal: z
        .string({
            error: (iss) =>
                iss.input === undefined ? 'Sport goal is required.' : 'Invalid sport goal ID.',
        })
        .regex(MongoObjectIdRegex, 'Sport goal must be a valid ID'),
});

export const editParticipantSchema = z
    .object({
        mainSport: z
            .string({
                error: (iss) =>
                    iss.input === undefined ? 'Main sport is required.' : 'Invalid main sport ID.',
            })
            .regex(MongoObjectIdRegex, 'Main sport must be a valid ID')
            .optional(),

        skillLevel: z
            .number({
                error: (iss) =>
                    iss.input === undefined ? 'Skill level is required.' : 'Invalid skill level.',
            })
            .min(1, 'Skill level must be at least 1')
            .max(10, 'Skill level must be at most 10')
            .optional(),

        sportGoal: z
            .string({
                error: (iss) =>
                    iss.input === undefined ? 'Sport goal is required.' : 'Invalid sport goal ID.',
            })
            .regex(MongoObjectIdRegex, 'Sport goal must be a valid ID')
            .optional(),
    })
    .refine(
        (data) =>
            data.mainSport !== undefined ||
            data.skillLevel !== undefined ||
            data.sportGoal !== undefined,
        {
            message: 'At least one of main sport, skill level, or sport goal must be provided.',
            path: [], // set to [] to attach error to the global object
        }
    );

export const SearchQuerySchema = z
    .object({
        // Pagination
        perPage: z
            .number()
            .int()
            .min(1, 'perPage must be at least 1')
            .max(100, 'perPage must be at most 100')
            .optional()
            .default(10),
        pageNumber: z.number().int().min(1, 'pageNumber must be at least 1').optional().default(1),

        // Search
        search: z.string().optional(),

        // Sorting
        sortBy: z.string().optional(),
        sortType: z.enum(['asc', 'desc']).optional().default('asc'),

        // Filters
        club: z.string().regex(MongoObjectIdRegex, 'ClubId must be a valid ID').optional(),
        group: z.string().regex(MongoObjectIdRegex, 'GroupId must be a valid ID').optional(),
        type: z.string().regex(MongoObjectIdRegex, 'TypeId must be a valid ID').optional(),
        style: z.string().regex(MongoObjectIdRegex, 'StyleId must be a valid ID').optional(),
        private: z.boolean().optional(),
        sportGroup: z
            .string()
            .regex(MongoObjectIdRegex, 'SportGroupId must be a valid ID')
            .optional(),
        sport: z.string().regex(MongoObjectIdRegex, 'SportId must be a valid ID').optional(),
        mainSport: z
            .string()
            .regex(MongoObjectIdRegex, 'MainSportId must be a valid ID')
            .optional(),
        sportGoal: z
            .string()
            .regex(MongoObjectIdRegex, 'SportGoalId must be a valid ID')
            .optional(),
        facility: z.string().regex(MongoObjectIdRegex, 'FacilityId must be a valid ID').optional(),
        salon: z.string().regex(MongoObjectIdRegex, 'SalonId must be a valid ID').optional(),
        isVerified: z.boolean().optional(),
    })
    .strict();

// coach/branch
export const createCoachSchema = z.array(
    z.object({
        sport: z
            .string({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'Sport id required.' }
                        : { message: 'Invalid sport id.' },
            })
            .regex(MongoObjectIdRegex, 'Provide a valid sport ID.'),

        branchOrder: z.number({
            error: (iss) =>
                iss.input === undefined
                    ? 'Branch order is required.'
                    : 'BranchOrder: Invalid input.',
        }),
        level: z.number({
            error: (iss) =>
                iss.input === undefined ? 'level is required.' : 'Level: Invalid input.',
        }),
        certificate: z.object({
            path: z
                .string({
                    error: (iss) =>
                        iss.input === undefined
                            ? { message: 'Path is required.' }
                            : { message: 'Invalid path.' },
                })
                .optional(),

            originalName: z
                .string({
                    error: (iss) =>
                        iss.input === undefined
                            ? { message: 'originalName is required.' }
                            : { message: 'Invalid originalName.' },
                })
                .optional(),

            mimeType: z
                .string({
                    error: (iss) =>
                        iss.input === undefined
                            ? { message: 'mimeType is required.' }
                            : { message: 'Invalid mimeType.' },
                })
                .optional(),

            size: z
                .number({
                    error: (iss) =>
                        iss.input === undefined ? 'Size is required.' : 'Size: Invalid input.',
                })
                .optional(),
        }).optional(),
    })
);

export const editCoachSchema = z
    .object({
        sport: z
            .string({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'Sport id required.' }
                        : { message: 'Invalid sport id.' },
            })
            .regex(MongoObjectIdRegex, 'Provide a valid sport ID.')
            .optional(),
        level: z
            .number({
                error: (iss) => (iss.input === undefined ? 'level is required.' : 'Invalid input.'),
            })
            .optional(),
    })
    .refine(
        (data) => {
            // Dynamically check only specific optional keys:
            const keysToCheck = ['sport', 'level'];
            return keysToCheck.some((key) => data[key] !== undefined);
        },
        {
            message: 'At least one field must be provided.',
            path: [], // or remove for a general form-level error
        }
    );

export const getEventParticipants = z.object({
    // Pagination
    perPage: z
        .number()
        .int()
        .min(1, 'perPage must be at least 1')
        .max(100, 'perPage must be at most 100')
        .optional()
        .default(10),
    pageNumber: z.number().int().min(1, 'pageNumber must be at least 1').optional().default(1),
    isApproved: z.boolean().optional(),
    isCancelled: z.boolean().optional(),
    isPaid: z.boolean().optional(),
    isCheckedIn: z.boolean().optional(),
    isWaitListed: z.boolean().optional(),
    isJoined: z.boolean().optional(),
});
// event
export const createEventSchema = z
    .object({
        name: z.string({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'Name is required.' }
                    : { message: 'Invalid Name.' },
        }),
        club: z
            .string({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'Club id required.' }
                        : { message: 'Invalid club id.' },
            })
            .regex(MongoObjectIdRegex, 'Provide a valid club ID.'),
        group: z
            .string({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'Group id required.' }
                        : { message: 'Invalid Group id.' },
            })
            .regex(MongoObjectIdRegex, 'Provide a valid club ID.'),
        startTime: z.date({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'Start time is required.' }
                    : { message: 'Invalid start time.' },
        }),
        endTime: z.date({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'End time is required.' }
                    : { message: 'Invalid end time.' },
        }),
        capacity: z.number({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'Capacity is required.' }
                    : { message: 'Invalid capacity.' },
        }),
        level: z.number({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'Level is required.' }
                    : { message: 'Invalid level.' },
        }),
        type: z.enum(['Indoor', 'Outdoor', 'Online'], {
            errorMap: (iss) =>
                iss.code === 'invalid_enum_value'
                    ? { message: 'Event type must be one of: Indoor, Outdoor, Online.' }
                    : iss.input === undefined
                        ? { message: 'Event type is required.' }
                        : { message: 'Invalid event type.' },
        }),
        style: z
            .string({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'Style required.' }
                        : { message: 'Invalid Style.' },
            })
            .regex(MongoObjectIdRegex, 'Provide a valid style ID.'),
        private: z.boolean({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'Private status is required.' }
                    : { message: 'Invalid Private status.' },
        }),
        sportGroup: z
            .string({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'Sport group is required.' }
                        : { message: 'Invalid Sport group.' },
            })
            .regex(MongoObjectIdRegex, 'Provide a valid sport group ID.'),
        sport: z
            .string({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'Sport is required.' }
                        : { message: 'Invalid Sport.' },
            })
            .regex(MongoObjectIdRegex, 'Provide a valid sport ID.'),
        priceType: z.enum(['Manual', 'Stable', 'Free'], {
            errorMap: (iss) =>
                iss.code === 'invalid_enum_value'
                    ? { message: 'Event type must be one of: Manual, Stable, Free.' }
                    : iss.input === undefined
                        ? { message: 'Price type is required.' }
                        : { message: 'Invalid Price type.' },
        }),
        participationFee: z.number({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'Participation fee is required.' }
                    : { message: 'Invalid participation fee.' },
        }),
        isRecurring: z.boolean({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'Recurring status is required.' }
                    : { message: 'Invalid Recurring status.' },
        }),
        facility: z
            .string({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'Facility is required.' }
                        : { message: 'Invalid facility.' },
            })
            .regex(MongoObjectIdRegex, 'Provide a valid facility ID.')
            .optional(),
        salon: z
            .string({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'Salon is required.' }
                        : { message: 'Invalid salon.' },
            })
            .regex(MongoObjectIdRegex, 'Provide a valid salon ID.')
            .optional(),
        location: z
            .string({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'Location is required.' }
                        : { message: 'Invalid location.' },
            })
            .optional(),
        equipment: z.string({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'Equipment is required.' }
                    : { message: 'Invalid equipment.' },
        }),
    })
    .refine(
        (data) => {
            const keysToCheck = ['facility', 'salon', 'location'];
            return keysToCheck.some((key) => data[key] !== undefined);
        },
        {
            message: 'At least one of facility, salon, location must be provided.',
            path: [],
        }
    );

export const editEventSchema = createEventSchema.partial();

// clubGroup
export const createGroupSchema = z.object({
    name: z.string({
        error: (iss) => (iss.input === undefined ? 'name is required.' : 'Invalid input.'),
    }),

    description: z
        .string({
            error: (iss) =>
                iss.input === undefined ? 'description is required.' : 'Invalid input.',
        })
        .optional(),
});

export const editGroupSchema = z
    .object({
        name: z
            .string({
                error: (iss) => (iss.input === undefined ? 'name is required.' : 'Invalid input.'),
            })
            .optional(),

        description: z
            .string({
                error: (iss) =>
                    iss.input === undefined ? 'description is required.' : 'Invalid input.',
            })
            .optional(),

        photo: z.object({}).passthrough().optional(),
    })
    .refine(
        (data) => {
            const keysToCheck = ['name', 'description', 'photo'];
            return keysToCheck.some((key) => data[key] !== undefined);
        },
        {
            message: 'At least one field must be provided.',
            path: [],
        }
    );

// club
export const createClubSchema = z.object({
    name: z.string({
        error: (iss) => (iss.input === undefined ? 'name is required.' : 'Invalid input.'),
    }),

    vision: z
        .string({
            error: (iss) => (iss.input === undefined ? 'vision is required.' : 'Invalid input.'),
        })
        .optional(),
    conditions: z
        .string({
            error: (iss) =>
                iss.input === undefined ? 'conditions is required.' : 'Invalid input.',
        })
        .optional(),
    president: z
        .string({
            error: (iss) => (iss.input === undefined ? 'president is required.' : 'Invalid input.'),
        })
        .optional(),
    coaches: z.array(mongoObjectId).optional(),
});

export const editClubSchema = z
    .object({
        name: z
            .string({
                error: (iss) => (iss.input === undefined ? 'name is required.' : 'Invalid input.'),
            })
            .optional(),

        vision: z
            .string({
                error: (iss) =>
                    iss.input === undefined ? 'vision is required.' : 'Invalid input.',
            })
            .optional(),
        conditions: z
            .string({
                error: (iss) =>
                    iss.input === undefined ? 'conditions is required.' : 'Invalid input.',
            })
            .optional(),
        president: z
            .string({
                error: (iss) =>
                    iss.input === undefined ? 'president is required.' : 'Invalid input.',
            })
            .optional(),
        coaches: z.array(mongoObjectId).optional(),
    })
    .refine(
        (data) => {
            // Dynamically check only specific optional keys:
            const keysToCheck = ['name', 'vision', 'conditions', 'president', 'coaches'];
            return keysToCheck.some((key) => data[key] !== undefined);
        },
        {
            message: 'At least one field must be provided.',
            path: [], // or remove for a general form-level error
        }
    );

// join requests
export const joinGroupSchema = z.object({
    userId: z
        .string({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'user id required.' }
                    : { message: 'Invalid user id.' },
        })
        .regex(MongoObjectIdRegex, 'Provide a valid user ID.'),

    groupId: z
        .string({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'Group id required.' }
                    : { message: 'Invalid group id.' },
        })
        .regex(MongoObjectIdRegex, 'Provide a valid group ID.'),
});

export const joinClubSchema = z.object({
    userId: z
        .string({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'user id required.' }
                    : { message: 'Invalid user id.' },
        })
        .regex(MongoObjectIdRegex, 'Provide a valid user ID.'),

    clubId: z
        .string({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'Club id required.' }
                    : { message: 'Invalid club id.' },
        })
        .regex(MongoObjectIdRegex, 'Provide a valid club ID.'),
});

export const joinEventSchema = z.object({
    userId: z
        .string({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'user id required.' }
                    : { message: 'Invalid user id.' },
        })
        .regex(MongoObjectIdRegex, 'Provide a valid user ID.'),

    eventId: z
        .string({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'Event id required.' }
                    : { message: 'Invalid event id.' },
        })
        .regex(MongoObjectIdRegex, 'Provide a valid event ID.'),
});

// facility
export const createFacilitySchema = z.object({
    name: z.string({
        error: (iss) =>
            iss.input === undefined
                ? { message: 'Name is required.' }
                : { message: 'Invalid name.' },
    }),

    address: z.string({
        error: (iss) =>
            iss.input === undefined
                ? { message: 'Address is required.' }
                : { message: 'Invalid address.' },
    }),

    phone: z.string({
        error: (iss) =>
            iss.input === undefined
                ? { message: 'Phone is required.' }
                : { message: 'Invalid phone.' },
    }),
    email: z
        .string({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'Email is required.' }
                    : { message: 'Invalid email.' },
        })
        .email('Provide a valid email address.')
        .optional(),

    mainSport: z
        .string({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'Main sport is required.' }
                    : { message: 'Invalid main sport.' },
        })
        .regex(MongoObjectIdRegex, 'Provide a valid main sport ID.'),

    membershipLevel: z
        .enum(['Gold', 'Platinum', 'Bronze', 'Silver'], {
            message: 'Membership level must be Gold, Platinum, Bronze, or Silver.',
        })
        .optional(),

    private: z.boolean().optional(),
});

export const editFacilitySchema = z.object({
    name: z
        .string({
            error: (iss) => ({ message: 'Invalid name.' }),
        })
        .optional(),

    address: z
        .string({
            error: (iss) => ({ message: 'Invalid address.' }),
        })
        .optional(),

    phone: z
        .string({
            error: (iss) => ({ message: 'Invalid phone.' }),
        })
        .optional(),

    email: z
        .string({
            error: (iss) => ({ message: 'Invalid email.' }),
        })
        .email('Provide a valid email address.')
        .optional(),

    mainSport: z
        .string({
            error: (iss) => ({ message: 'Invalid main sport.' }),
        })
        .regex(MongoObjectIdRegex, 'Provide a valid main sport ID.')
        .optional(),

    membershipLevel: z
        .enum(['Gold', 'Platinum', 'Bronze', 'Silver'], {
            message: 'Membership level must be Gold, Platinum, Bronze, or Silver.',
        })
        .optional(),

    private: z.boolean().optional(),
});

export const createSalonSchema = z.object({
    facilityId: z
        .string({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'Facility id is required.' }
                    : { message: 'Invalid facility id.' },
        })
        .regex(MongoObjectIdRegex, 'Provide a valid facility ID.'),

    name: z.string({
        error: (iss) =>
            iss.input === undefined
                ? { message: 'Name is required.' }
                : { message: 'Invalid name.' },
    }),

    sportGroup: z
        .string({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'Sport group is required.' }
                    : { message: 'Invalid sport group.' },
        })
        .regex(MongoObjectIdRegex, 'Provide a valid sport group ID.'),

    sport: z
        .string({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'Sport is required.' }
                    : { message: 'Invalid sport.' },
        })
        .regex(MongoObjectIdRegex, 'Provide a valid sport ID.'),

    priceInfo: z.string({
        error: (iss) =>
            iss.input === undefined
                ? { message: 'Price info is required.' }
                : { message: 'Invalid price info.' },
    }),
});

export const editSalonSchema = z
    .object({
        name: z
            .string({
                error: (iss) => ({ message: 'Invalid name.' }),
            })
            .min(1, 'Name cannot be empty.')
            .optional(),

        sportGroup: z
            .string({
                error: (iss) => ({ message: 'Invalid sport group.' }),
            })
            .regex(MongoObjectIdRegex, 'Provide a valid sport group ID.')
            .optional(),

        sport: z
            .string({
                error: (iss) => ({ message: 'Invalid sport.' }),
            })
            .regex(MongoObjectIdRegex, 'Provide a valid sport ID.')
            .optional(),

        priceInfo: z
            .string({
                error: (iss) => ({ message: 'Invalid price info.' }),
            })
            .min(1, 'Price info cannot be empty.')
            .optional(),
    })
    .refine(
        (data) => {
            // Dynamically check only specific optional keys:
            const keysToCheck = ['name', 'sportGroup', 'sport', 'priceInfo'];
            return keysToCheck.some((key) => data[key] !== undefined);
        },
        {
            message: 'At least one field must be provided.',
            path: [], // or remove for a general form-level error
        }
    );

export const salonCalendarTimeSchema = z.object({
    salonId: z
        .string({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'Salon id is required.' }
                    : { message: 'Invalid salon id.' },
        })
        .regex(MongoObjectIdRegex, 'Provide a valid salon ID.'),

    isTaken: z.boolean().optional(),

    date: z.iso.datetime({
        error: (iss) =>
            iss.input === undefined
                ? { message: 'Date is required.' }
                : { message: 'Invalid date.' },
    }),

    fromTime: z.iso.datetime({
        error: (iss) =>
            iss.input === undefined
                ? { message: 'FromTime is required.' }
                : { message: 'Invalid FromTime.' },
    }),

    toTime: z.iso.datetime({
        error: (iss) =>
            iss.input === undefined
                ? { message: 'ToTime is required.' }
                : { message: 'Invalid ToTime.' },
    }),
});

export const editCalendarSchema = z
    .object({
        salonId: z
            .string({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'Salon id is required.' }
                        : { message: 'Invalid salon id.' },
            })
            .regex(MongoObjectIdRegex, 'Provide a valid salon ID.'),

        isTaken: z.boolean().optional(),

        date: z.iso
            .datetime({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'Date is required.' }
                        : { message: 'Invalid date.' },
            })
            .optional(),

        fromTime: z.iso
            .datetime({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'FromTime is required.' }
                        : { message: 'Invalid FromTime.' },
            })
            .optional(),

        toTime: z.iso
            .datetime({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'ToTime is required.' }
                        : { message: 'Invalid ToTime.' },
            })
            .optional(),
    })
    .refine(
        (data) => {
            // Dynamically check only specific optional keys:
            const keysToCheck = ['date', 'fromTime', 'toTime', 'isTaken'];
            return keysToCheck.some((key) => data[key] !== undefined);
        },
        {
            message: 'At least one field must be provided.',
            path: [], // or remove for a general form-level error
        }
    );

// company
export const createCompanySchema = z.object({
    name: z.string({
        error: (iss) =>
            iss.input === undefined
                ? { message: 'Name is required.' }
                : { message: 'Invalid name.' },
    }),

    address: z.string({
        error: (iss) =>
            iss.input === undefined
                ? { message: 'Address is required.' }
                : { message: 'Invalid address.' },
    }),

    phone: z
        .string({
            error: (iss) => ({ message: 'Invalid phone.' }),
        })
        .optional(),

    email: z
        .string({
            error: (iss) => ({ message: 'Invalid email.' }),
        })
        .email('Provide a valid email address.')
        .optional(),
});

export const editCompanySchema = z.object({
    name: z
        .string({
            error: (iss) => ({ message: 'Invalid name.' }),
        })
        .optional(),

    address: z
        .string({
            error: (iss) => ({ message: 'Invalid address.' }),
        })
        .optional(),

    phone: z
        .string({
            error: (iss) => ({ message: 'Invalid phone.' }),
        })
        .optional(),

    email: z
        .string({
            error: (iss) => ({ message: 'Invalid email.' }),
        })
        .email('Provide a valid email address.')
        .optional(),
});
