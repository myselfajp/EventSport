import { z } from 'zod';
import { parseSecureEventLink } from './eventLinkSecurity.js';

const passwordMin = 8;
// Yalnızca aşırı uzunluk / istismar (DoS) saldırılarına karşı sert tavan; ürün açısından "üst sınır yok" kabul edilebilir.
const passwordMax = 1024;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_RULE_MESSAGE =
    'Şifre en az 8 karakter olmalı ve en az bir büyük harf, bir küçük harf, bir rakam ve bir sembol içermelidir.';
const hexRegex = /^#([0-9A-F]{6}|[0-9A-F]{3})$/i;
const MongoObjectIdRegex = /^[a-fA-F\d]{24}$/;
const CountryCodeRegex = /^[A-Z]{2}$/;

const optionalTrimmedText = (max = 120) => z.string().trim().max(max).optional().default('');
const countryCodeInput = z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
    z.string().regex(CountryCodeRegex, 'Provide a valid 2-letter country code.').default('TR')
);

export const name = z.string({
    error: (iss) => (iss.input === undefined ? 'name is required.' : 'Invalid name.'),
});

export const color = z
    .string({
        error: (iss) => (iss.input === undefined ? 'Color is required.' : 'Invalid color hex.'),
    })
    .regex(hexRegex, 'Provide a valid color hex.');

export const checkInOpensHoursBeforeStart = z.coerce
    .number()
    .int('Check-in hours must be a whole number.')
    .min(0, 'Check-in hours cannot be negative.')
    .max(720, 'Check-in hours cannot exceed 720 (30 days).')
    .default(48);

export const recurrenceInputSchema = z.object({
    frequency: z.enum(['weekly', 'daily', 'monthly'], {
        errorMap: () => ({ message: 'Frequency must be weekly, daily, or monthly.' }),
    }),
    interval: z.coerce.number().int().min(1).max(30).default(1),
    sessionCount: z.coerce.number().int().min(2).max(52),
});

export const eventEditScopeSchema = z.enum(['single', 'following']).default('single');

export const mongoObjectId = z
    .string({ error: (iss) => (iss.input === undefined ? 'ID is required.' : 'Invalid ID.') })
    .regex(MongoObjectIdRegex, 'Provide a valid ID.');

/** Istanbul district (+ optional street detail). */
export const locationInputSchema = z.object({
    district: mongoObjectId,
    addressLine: z.string().trim().optional(),
});

export const optionalLocationFieldsSchema = z.object({
    district: mongoObjectId.optional(),
    addressLine: z.string().trim().optional(),
});

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

/** Coach star rating (1–5). */
export const coachStarRating = z
    .number({
        error: (iss) =>
            iss.input === undefined ? 'Rating is required.' : 'Invalid rating.',
    })
    .int('Rating must be a whole number.')
    .min(1, 'Rating must be at least 1 star.')
    .max(5, 'Rating must be at most 5 stars.');

export const coachReviewComment = z
    .string({
        error: (iss) =>
            iss.input === undefined ? 'Comment is required.' : 'Invalid comment.',
    })
    .trim()
    .min(1, 'Comment cannot be empty.')
    .max(2000, 'Comment must be at most 2000 characters.');
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
                    ? { message: 'Şifre alanı zorunludur.' }
                    : { message: 'Geçersiz şifre.' },
        })
        .min(passwordMin, PASSWORD_RULE_MESSAGE)
        .max(passwordMax, `Şifre en fazla ${passwordMax} karakter olabilir.`)
        .regex(passwordRegex, PASSWORD_RULE_MESSAGE),

    age: z.date({
        error: (iss) =>
            iss.input === undefined ? { message: 'Age is required.' } : { message: 'Invalid age.' },
    }),

    agreeTerms: z.literal(true, {
        errorMap: () => ({ message: 'You must agree to the Terms and Conditions.' }),
    }),
    agreeKvkk: z.literal(true, {
        errorMap: () => ({ message: 'You must agree to the KVKK.' }),
    }),
    termsVersionId: z.string().regex(MongoObjectIdRegex, 'Invalid terms version ID.'),
    kvkkVersionId: z.string().regex(MongoObjectIdRegex, 'Invalid KVKK version ID.'),

    otp: z
        .string({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'Doğrulama kodu gerekli.' }
                    : { message: 'Geçersiz doğrulama kodu.' },
        })
        .length(6, 'Doğrulama kodu 6 haneli olmalıdır.')
        .regex(/^\d{6}$/, 'Doğrulama kodu 6 haneli olmalıdır.'),

    /** Optional IYS / commercial electronic messages opt-in at signup. */
    marketingConsent: z.boolean().optional().default(false),
    commercialMessagesVersionId: z
        .string()
        .regex(MongoObjectIdRegex, 'Invalid commercial messages version ID.')
        .optional(),

    country: countryCodeInput,
    state: optionalTrimmedText(),
    city: optionalTrimmedText(),
    districtName: optionalTrimmedText(),
    postalCode: optionalTrimmedText(24),
    district: mongoObjectId.optional(),
}).superRefine((data, ctx) => {
    if (data.marketingConsent && !data.commercialMessagesVersionId) {
        ctx.addIssue({
            code: 'custom',
            message: 'Commercial messages consent version is required when opting in.',
            path: ['commercialMessagesVersionId'],
        });
    }

    // The product only supports Turkey and the United States.
    if (data.country !== 'TR' && data.country !== 'US') {
        ctx.addIssue({
            code: 'custom',
            message: 'Registration is only available for Turkey and the United States.',
            path: ['country'],
        });
        return;
    }

    if (data.country === 'TR') {
        if (!data.city) {
            ctx.addIssue({ code: 'custom', message: 'City (province) is required.', path: ['city'] });
        }
        if (!data.districtName) {
            ctx.addIssue({
                code: 'custom',
                message: 'District is required.',
                path: ['districtName'],
            });
        }
        if (!data.postalCode) {
            ctx.addIssue({
                code: 'custom',
                message: 'Postal code is required.',
                path: ['postalCode'],
            });
        }
        return;
    }

    // US
    if (!data.state) {
        ctx.addIssue({ code: 'custom', message: 'State is required.', path: ['state'] });
    }
    if (!data.city) {
        ctx.addIssue({ code: 'custom', message: 'City is required.', path: ['city'] });
    }
    if (!data.postalCode) {
        ctx.addIssue({ code: 'custom', message: 'ZIP code is required.', path: ['postalCode'] });
    }
});

export const sendRegistrationOtpSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email('Geçerli bir e-posta adresi girin.'),
    firstName: z.string().trim().optional(),
});

export const adminCreateUserSchema = z.object({
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
                    ? { message: 'Şifre alanı zorunludur.' }
                    : { message: 'Geçersiz şifre.' },
        })
        .min(passwordMin, PASSWORD_RULE_MESSAGE)
        .max(passwordMax, `Şifre en fazla ${passwordMax} karakter olabilir.`)
        .regex(passwordRegex, PASSWORD_RULE_MESSAGE),
    age: z.date({
        error: (iss) =>
            iss.input === undefined ? { message: 'Age is required.' } : { message: 'Invalid age.' },
    }),
    role: z.union([z.literal(0), z.literal(1)]).optional().default(1),
    isActive: z.boolean().optional().default(true),
    adminPermissionGroups: z.array(mongoObjectId).max(32).optional(),
});

export const loginSchema = z.object({
    email: z
        .string({
            error: (iss) => (iss.input === undefined ? 'E-posta zorunludur.' : 'Geçersiz e-posta.'),
        })
        .email('Geçerli bir e-posta adresi giriniz.'),

    password: z
        .string({
            error: (iss) =>
                iss.input === undefined ? 'Şifre zorunludur.' : 'Geçersiz şifre.',
        })
        .min(1, 'Şifre zorunludur.')
        .max(passwordMax, `Şifre en fazla ${passwordMax} karakter olabilir.`),
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
        newPassword: z
            .string({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'Yeni şifre zorunludur.' }
                        : { message: 'Geçersiz yeni şifre.' },
            })
            .min(passwordMin, PASSWORD_RULE_MESSAGE)
            .max(passwordMax, `Şifre en fazla ${passwordMax} karakter olabilir.`)
            .regex(passwordRegex, PASSWORD_RULE_MESSAGE)
            .optional(),
        oldPassword: z
            .string({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'Mevcut şifre zorunludur.' }
                        : { message: 'Geçersiz mevcut şifre.' },
            })
            .min(1, 'Mevcut şifre zorunludur.')
            .max(passwordMax, `Şifre en fazla ${passwordMax} karakter olabilir.`)
            .optional(),
        photo: z
            .string()
            .optional(),
        deletePhoto: z
            .string()
            .optional(),
        district: mongoObjectId.optional(),
        addressLine: z.string().trim().optional(),
        country: countryCodeInput.optional(),
        state: optionalTrimmedText().optional(),
        city: optionalTrimmedText().optional(),
        districtName: optionalTrimmedText().optional(),
        postalCode: optionalTrimmedText(24).optional(),
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
            data.oldPassword !== undefined ||
            data.deletePhoto !== undefined ||
            data.district !== undefined ||
            data.addressLine !== undefined ||
            data.country !== undefined ||
            data.state !== undefined ||
            data.city !== undefined ||
            data.districtName !== undefined ||
            data.postalCode !== undefined,
        {
            message:
                'At least one of first name, last name, phone, email, age, photo, password, location, or deletePhoto must be provided.',
            path: [], // set to [] to attach error to the global object
        }
    );

export const accountSettingsSchema = z
    .object({
        marketingConsent: z.boolean({
            error: () => ({ message: 'marketingConsent must be true or false.' }),
        }),
        commercialMessagesVersionId: mongoObjectId.optional(),
    })
    .superRefine((data, ctx) => {
        if (data.marketingConsent && !data.commercialMessagesVersionId) {
            ctx.addIssue({
                code: 'custom',
                message: 'commercialMessagesVersionId is required when enabling marketing consent.',
                path: ['commercialMessagesVersionId'],
            });
        }
    });

export const cookieConsentSchema = z.object({
    functional: z.boolean(),
    analytics: z.boolean(),
    marketing: z.boolean(),
    visitorKey: z.string().trim().min(8).max(128).optional(),
    consentedAt: z.string().datetime().optional(),
});

export const requestAccountDeletionSchema = z.object({
    confirmation: z.literal('delete', {
        errorMap: () => ({ message: 'Type "delete" to confirm account deletion.' }),
    }),
});

/** Admin-only user updates (includes role, active flag, permission groups). */
export const adminEditUserSchema = z
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
        newPassword: z
            .string({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'Yeni şifre zorunludur.' }
                        : { message: 'Geçersiz yeni şifre.' },
            })
            .min(passwordMin, PASSWORD_RULE_MESSAGE)
            .max(passwordMax, `Şifre en fazla ${passwordMax} karakter olabilir.`)
            .regex(passwordRegex, PASSWORD_RULE_MESSAGE)
            .optional(),
        oldPassword: z
            .string({
                error: (iss) =>
                    iss.input === undefined
                        ? { message: 'Mevcut şifre zorunludur.' }
                        : { message: 'Geçersiz mevcut şifre.' },
            })
            .min(1, 'Mevcut şifre zorunludur.')
            .max(passwordMax, `Şifre en fazla ${passwordMax} karakter olabilir.`)
            .optional(),
        photo: z.string().optional(),
        deletePhoto: z.string().optional(),
        district: mongoObjectId.optional(),
        addressLine: z.string().trim().optional(),
        isActive: z.boolean().optional(),
        role: z.union([z.literal(0), z.literal(1)]).optional(),
        adminPermissionGroups: z.array(mongoObjectId).max(32).optional(),
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
            data.oldPassword !== undefined ||
            data.deletePhoto !== undefined ||
            data.district !== undefined ||
            data.addressLine !== undefined ||
            data.isActive !== undefined ||
            data.role !== undefined ||
            data.adminPermissionGroups !== undefined,
        {
            message:
                'At least one field must be provided for update.',
            path: [],
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

        // Profile Type Filter
        profileType: z.enum(['participant', 'coach', 'facility', 'performance']).optional(),

        performanceBranch: z
            .enum(['manager', 'psychologist', 'dietitian', 'psychotherapist'])
            .optional(),

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
        creator: z.string().regex(MongoObjectIdRegex, 'CreatorId must be a valid ID').optional(),
        owner: z.string().regex(MongoObjectIdRegex, 'OwnerId must be a valid ID').optional(),
        /** Admin event list: active | cancelled | all (handled in get-event extraFilter) */
        status: z.enum(['active', 'cancelled', 'all']).optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        district: z.string().regex(MongoObjectIdRegex, 'DistrictId must be a valid ID').optional(),
        /** Country-agnostic locality key for nearby matching (e.g. tr:van:edremit). */
        locationKey: z.string().trim().max(160).optional(),
    })
    .strict();

// coach/branch
export const createCoachBranchItemSchema = z.object({
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
    certificateLevel: z.enum(['A', 'B', 'C']).default('A'),
    certificate: z
        .object({
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
        })
        .optional(),
});

export const createCoachSchema = z.array(createCoachBranchItemSchema);

export const coachProfilePayloadSchema = z
    .object({
        branches: createCoachSchema,
        agreeCoachAgreement: z.boolean().optional(),
        marketingConsent: z.boolean().optional(),
        commercialMessagesVersionId: z
            .string()
            .regex(MongoObjectIdRegex, 'Invalid commercial messages version ID.')
            .optional(),
    })
    .superRefine((data, ctx) => {
        if (data.marketingConsent && !data.commercialMessagesVersionId) {
            ctx.addIssue({
                code: 'custom',
                message: 'Commercial messages consent version is required when opting in.',
                path: ['commercialMessagesVersionId'],
            });
        }
    });

/**
 * @param {string} dataString - req.body.data (JSON string): either a branch array (legacy) or { branches, agreeCoachAgreement?, marketingConsent? }
 */
export const parseCoachProfileFormData = (dataString) => {
    const raw = JSON.parse(dataString);
    if (Array.isArray(raw)) {
        return {
            branches: createCoachSchema.parse(raw),
            agreeCoachAgreement: undefined,
            marketingConsent: undefined,
            commercialMessagesVersionId: undefined,
        };
    }
    const obj = coachProfilePayloadSchema.parse(raw);
    return {
        branches: obj.branches,
        agreeCoachAgreement: obj.agreeCoachAgreement,
        marketingConsent: obj.marketingConsent,
        commercialMessagesVersionId: obj.commercialMessagesVersionId,
    };
};

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
            .union([
                z.string().regex(MongoObjectIdRegex, 'Provide a valid club ID.'),
                z.literal(''),
            ])
            .optional(),
        group: z
            .union([
                z.string().regex(MongoObjectIdRegex, 'Provide a valid club ID.'),
                z.literal(''),
            ])
            .optional(),
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
        checkInOpensHoursBeforeStart: z.coerce
            .number()
            .int('Check-in hours must be a whole number.')
            .min(0, 'Check-in hours cannot be negative.')
            .max(720, 'Check-in hours cannot exceed 720 (30 days).')
            .optional(),
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
        district: z
            .string()
            .regex(MongoObjectIdRegex, 'Provide a valid district ID.')
            .optional(),
        country: countryCodeInput.optional(),
        state: optionalTrimmedText().optional(),
        city: optionalTrimmedText().optional(),
        districtName: optionalTrimmedText().optional(),
        equipment: z.string({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'Equipment is required.' }
                    : { message: 'Invalid equipment.' },
        }),
        eventDetails: z
            .string()
            .max(5000, 'Event details must be at most 5000 characters')
            .optional()
            .default(''),

        eventLink: z
            .string()
            .trim()
            .max(500, 'Event link must be at most 500 characters')
            .optional()
            .default('')
            .transform((v, ctx) => {
                const result = parseSecureEventLink(v);
                if (!result.ok) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: result.error,
                    });
                    return z.NEVER;
                }
                return result.url;
            }),
    })
    .superRefine((data, ctx) => {
        const isOnline = data.type === 'Online';

        if (!isOnline) {
            const hasVenue = Boolean(data.facility || data.salon || data.location);
            if (!hasVenue) {
                ctx.addIssue({
                    code: 'custom',
                    message: 'At least one of facility, salon, location must be provided.',
                    path: [],
                });
            }

            const hasExplicitLocation =
                data.country === 'US'
                    ? Boolean(data.state && data.city)
                    : Boolean(data.country && data.city && data.districtName);
            const hasDistrictSource = Boolean(
                data.district || data.facility || data.salon || hasExplicitLocation
            );
            if (!hasDistrictSource) {
                ctx.addIssue({
                    code: 'custom',
                    message:
                        'Location is required for non-online events. Select a facility/salon, or choose country, city and district.',
                    path: ['district'],
                });
            }
        }
    });

/** Parsed client payload for create-event (includes recurrence extras). */
export const createEventPayloadSchema = createEventSchema
    .extend({
        recurrence: recurrenceInputSchema.optional(),
        listingPurchaseConfirmed: z.boolean().optional().default(false),
        invitedUserIds: z.array(mongoObjectId).max(100).optional().default([]),
    })
    .superRefine((data, ctx) => {
        const isOnline = data.type === 'Online';

        if (!isOnline) {
            const hasVenue = Boolean(data.facility || data.salon || data.location);
            if (!hasVenue) {
                ctx.addIssue({
                    code: 'custom',
                    message: 'At least one of facility, salon, location must be provided.',
                    path: [],
                });
            }

            const hasExplicitLocation =
                data.country === 'US'
                    ? Boolean(data.state && data.city)
                    : Boolean(data.country && data.city && data.districtName);
            const hasDistrictSource = Boolean(
                data.district || data.facility || data.salon || hasExplicitLocation
            );
            if (!hasDistrictSource) {
                ctx.addIssue({
                    code: 'custom',
                    message:
                        'Location is required for non-online events. Select a facility/salon, or choose country, city and district.',
                    path: ['district'],
                });
            }
        }

        if (data.isRecurring) {
            if (!data.recurrence) {
                ctx.addIssue({
                    code: 'custom',
                    message: 'Recurrence settings are required when isRecurring is true.',
                    path: ['recurrence'],
                });
            }
            if (!data.listingPurchaseConfirmed) {
                ctx.addIssue({
                    code: 'custom',
                    message: 'You must confirm listing purchase for a recurring series.',
                    path: ['listingPurchaseConfirmed'],
                });
            }
        } else if (data.recurrence) {
            ctx.addIssue({
                code: 'custom',
                message: 'Recurrence is only allowed when isRecurring is true.',
                path: ['recurrence'],
            });
        }
    });

export const editEventSchema = createEventSchema.partial();

export const inviteCandidateSearchSchema = z.object({
    search: z.string().trim().max(120).optional().default(''),
    limit: z.coerce.number().int().min(1).max(20).optional().default(10),
});

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

    mainSport: mongoObjectId.optional(),

    district: mongoObjectId.optional(),
    addressLine: z.string().trim().optional(),
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

        mainSport: mongoObjectId.optional(),

        district: mongoObjectId.optional(),
        addressLine: z.string().trim().optional(),
    })
    .refine(
        (data) => {
            const keysToCheck = [
                'name',
                'description',
                'photo',
                'mainSport',
                'district',
                'addressLine',
            ];
            return keysToCheck.some((key) => data[key] !== undefined);
        },
        {
            message: 'At least one field must be provided.',
            path: [],
        }
    );

// club
export const createClubSchema = z
    .object({
        name: z.string({
            error: (iss) => (iss.input === undefined ? 'name is required.' : 'Invalid input.'),
        }),

        mainSport: mongoObjectId.optional(),

        district: mongoObjectId.optional(),
        addressLine: z.string().trim().optional(),

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

        mainSport: mongoObjectId.optional(),

        district: mongoObjectId.optional(),
        addressLine: z.string().trim().optional(),

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
            const keysToCheck = [
                'name',
                'vision',
                'conditions',
                'president',
                'coaches',
                'mainSport',
                'district',
                'addressLine',
            ];
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

/** Required affirmations when joining an event (gamers). */
export const makeReservationBodySchema = z.object({
    eventId,
    acceptHealthNoIllness: z.literal(true),
    acceptHealthNoDisability: z.literal(true),
    acceptHealthNoMedication: z.literal(true),
    acceptHealthSportOk: z.literal(true),
    acceptDistantSelling: z.literal(true),
    acceptEventPurchaseTerms: z.literal(true),
    distanceSellingVersionId: z
        .string()
        .regex(MongoObjectIdRegex, 'Invalid distance selling document version ID.'),
    eventContractVersionId: z
        .string()
        .regex(MongoObjectIdRegex, 'Invalid event contract document version ID.'),
});

/** Bulk enrollment in a recurring event series (Phase 3). */
export const enrollSeriesSchema = makeReservationBodySchema.omit({ eventId: true }).extend({
    seriesId: z
        .string({
            error: (iss) =>
                iss.input === undefined
                    ? { message: 'Series id required.' }
                    : { message: 'Invalid series id.' },
        })
        .regex(MongoObjectIdRegex, 'Provide a valid series ID.'),
});

export const listingQuoteQuerySchema = z.object({
    sessionCount: z.coerce.number().int().min(2).max(52).default(2),
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
export const createFacilitySchema = z
    .object({
    name: z.string({
        error: (iss) =>
            iss.input === undefined
                ? { message: 'Name is required.' }
                : { message: 'Invalid name.' },
    }),

    address: z
        .string({
            error: (iss) => ({ message: 'Invalid address.' }),
        })
        .optional(),

    district: mongoObjectId.optional(),
    addressLine: z.string().trim().optional(),

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
})
    .refine((data) => Boolean(data.district), {
        message: 'Istanbul district is required.',
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

    district: mongoObjectId.optional(),
    addressLine: z.string().trim().optional(),

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

    description: z.string().optional(),
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

        description: z.string().optional(),

        clearPhoto: z.boolean().optional(),
    })
    .refine(
        (data) => {
            const keysToCheck = ['name', 'sportGroup', 'sport', 'priceInfo', 'description', 'clearPhoto'];
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
export const createCompanySchema = z
    .object({
    name: z.string({
        error: (iss) =>
            iss.input === undefined
                ? { message: 'Name is required.' }
                : { message: 'Invalid name.' },
    }),

    address: z
        .string({
            error: (iss) => ({ message: 'Invalid address.' }),
        })
        .optional(),

    district: mongoObjectId.optional(),
    addressLine: z.string().trim().optional(),

    mainSport: mongoObjectId.optional(),

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

    companyType: z.enum(['sponsor', 'sport'], {
        error: (iss) =>
            iss.input === undefined
                ? { message: 'Company type is required.' }
                : { message: 'Invalid company type.' },
    }),
})
    .refine(
        (data) =>
            (data.address && String(data.address).trim()) || Boolean(data.district),
        { message: 'Select an Istanbul district or enter a legacy address.' }
    );

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

    district: mongoObjectId.optional(),
    addressLine: z.string().trim().optional(),

    mainSport: mongoObjectId.optional(),

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

    companyType: z
        .enum(['sponsor', 'sport'], {
            error: (iss) => ({ message: 'Invalid company type.' }),
        })
        .optional(),
});

/** Public suggestion form (footer). */
export const suggestionSubmitSchema = z.object({
    message: z
        .string({
            error: (iss) =>
                iss.input === undefined ? { message: 'Mesaj zorunludur.' } : { message: 'Geçersiz mesaj.' },
        })
        .trim()
        .min(10, 'Mesaj en az 10 karakter olmalıdır.')
        .max(4000, 'Mesaj en fazla 4000 karakter olabilir.'),
    email: z.string().email('Geçerli bir e-posta girin.').optional(),
    contactName: z.string().trim().max(120, 'İsim en fazla 120 karakter olabilir.').optional(),
});

export const REPORT_REASONS = [
    'impersonation',
    'fake_profile',
    'misleading_event',
    'inappropriate_content',
    'spam',
    'harassment',
    'other',
];

export const submitReportSchema = z.object({
    targetType: z.enum(['user', 'coach', 'event', 'facility', 'company', 'club', 'community']),
    targetId: mongoObjectId,
    reason: z.enum(REPORT_REASONS).optional(),
    details: z.string().trim().max(500, 'Details must be at most 500 characters.').optional().default(''),
});

export const adminListReportsSchema = z.object({
    perPage: z.number().int().min(1).max(100).optional().default(20),
    pageNumber: z.number().int().min(1).optional().default(1),
    status: z.enum(['open', 'resolved', 'dismissed', 'all']).optional().default('open'),
    targetType: z.enum(['user', 'coach', 'event', 'facility', 'company', 'club', 'community']).optional(),
    search: z.string().optional(),
});

export const resolveReportSchema = z.object({
    action: z.enum(['dismiss', 'suspend_user', 'cancel_event', 'delete_event']),
    note: z.string().trim().max(500).optional().default(''),
});
