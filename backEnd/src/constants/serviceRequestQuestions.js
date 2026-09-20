export const SPORTS_GOAL_OPTIONS = [
    'Just started, I don\'t have any idea what to do',
    'Beginner with few months of experience',
    'Motivating Back - I made it in the past, decided to come back',
    'I want to keep up with pre intermediates',
    'I want to keep up with intermediates',
    'I want to keep up with professionals',
    'I want to be a champion and have long term commitment',
];

export const MANAGER_GOAL_OPTIONS = [
    'I am in the youth academy and want to move up to the first team',
    'I am already on a team but want to switch teams',
    'I am an individual athlete looking to join a team or club',
    'I generally need an agent',
];

export const REQUEST_QUESTIONS = [
    {
        key: 'sportGroupBranch',
        question: 'Sport group and branch',
        type: 'sport_select',
        targets: ['coach'],
    },
    {
        key: 'level',
        question: 'Your level',
        type: 'level_confirm',
        targets: ['coach', 'performance'],
    },
    {
        key: 'sportsGoal',
        question: 'Your sports goal',
        type: 'single_choice',
        options: SPORTS_GOAL_OPTIONS,
        targets: ['coach', 'performance'],
        excludeBranches: ['manager'],
    },
    {
        key: 'sportsGoal',
        question: 'Goal',
        type: 'single_choice',
        options: MANAGER_GOAL_OPTIONS,
        targets: ['performance'],
        onlyBranches: ['manager'],
    },
    {
        key: 'sessionFormat',
        question: 'Private lesson or group lesson?',
        type: 'single_choice',
        options: ['Private lesson', 'Group lesson'],
        targets: ['coach'],
    },
    {
        key: 'instructorGender',
        question: 'Instructor gender preference',
        type: 'single_choice',
        options: ['No preference', 'Male instructor', 'Female instructor'],
        targets: ['coach', 'performance'],
        excludeBranches: ['manager'],
    },
    {
        key: 'location',
        question: 'Country, city, and district',
        type: 'location',
        targets: ['coach', 'performance'],
    },
    {
        key: 'budget',
        question: 'Monthly budget',
        type: 'single_choice',
        options: ['I have set a monthly budget', 'Let me get a quote'],
        targets: ['coach', 'performance'],
    },
    {
        key: 'availableDays',
        question: 'Which days are you available?',
        type: 'multi_choice',
        options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        targets: ['coach', 'performance'],
        excludeBranches: ['manager'],
    },
    {
        key: 'availableTimes',
        question: 'Which time slots work for you?',
        type: 'multi_choice',
        options: [
            'Morning (6am–12pm)',
            'Afternoon (12pm–5pm)',
            'Evening (5pm–9pm)',
            'Night (9pm+)',
        ],
        targets: ['coach', 'performance'],
        excludeBranches: ['manager'],
    },
    {
        key: 'facilityPreference',
        question: 'Facility preference',
        type: 'single_choice',
        options: ['Private facility', 'Open area', 'Online', 'No preference'],
        targets: ['coach'],
    },
    {
        key: 'facilityPreference',
        question: 'Online or face to face?',
        type: 'single_choice',
        options: ['Online', 'Face to face'],
        targets: ['performance'],
        excludeBranches: ['manager'],
    },
    {
        key: 'additionalDetails',
        question: 'Any other details?',
        type: 'textarea',
        targets: ['coach', 'performance'],
    },
    {
        key: 'emailConsent',
        question: 'Email contact consent',
        type: 'consent',
        targets: ['coach', 'performance'],
    },
];

export function questionsForTarget(targetType, performanceBranch = null) {
    return REQUEST_QUESTIONS.filter((q) => {
        if (!q.targets.includes(targetType)) return false;
        if (targetType === 'performance' && performanceBranch) {
            if (q.onlyBranches && !q.onlyBranches.includes(performanceBranch)) return false;
            if (q.excludeBranches && q.excludeBranches.includes(performanceBranch)) return false;
        } else if (q.onlyBranches) {
            return false;
        }
        return true;
    });
}

export function expectedAnswerCountForTarget(targetType, performanceBranch = null) {
    return questionsForTarget(targetType, performanceBranch).length;
}
