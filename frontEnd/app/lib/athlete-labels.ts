/** User-facing labels for the participant role. Internal keys remain `participant` / `gamer`. */
export const ATHLETE_LABELS = {
  singular: "Athlete",
  plural: "Athletes",
  lowercase: "athlete",
  lowercasePlural: "athletes",
  profile: "Athlete Profile",
  createProfile: "Create Athlete Profile",
  editProfile: "Edit Athlete Profile",
  profileShort: "Athlete profile",
  profileRequired: "Athlete profile required",
  information: "Athlete Information",
  fee: "Athlete Fee",
  eventParticipants: "Event Athletes",
  viewParticipants: "View Athletes",
  noParticipantsYet: "No athletes yet",
  inviteTitle: "Invite Athletes",
  findPlaceholder: "Find athletes",
  searching: "Searching athletes...",
  noMatches: "No matching athletes found.",
  searchFailed: "Failed to search athletes",
  searchError: "An error occurred while searching athletes",
  couldNotSearch: "Could not search athletes.",
  saveFailed: "Failed to save athlete profile",
  preferencesHint: "Save your athlete preferences to personalize events.",
  createProfileToJoinPanel:
    "Create an Athlete profile in the left panel to join events",
  createProfileToLike: "Create an athlete profile to like events.",
  createProfileToFollow: "Create an athlete profile to follow.",
  createProfileToFavorites: "Create an athlete profile to add favorites.",
  createProfileToJoinEvents: "Create an athlete profile to join events.",
  createProfileToRegistered:
    "Create an athlete profile to use Registered Events",
  createProfileToParticipated:
    "Create an athlete profile to use Participated Events",
  createProfileToSeeEvents:
    "Create an athlete profile to see registered and participated events.",
  createProfileToFollowings:
    "Create an athlete profile to start following coaches, facilities,",
  profileRequiredBanner:
    "To join events, create and save your Athlete profile from the left panel.",
  serviceRequestFrom: "Athlete",
  serviceRequestReview:
    "Review service requests sent by athletes and show your interest.",
  messagePlaceholder: "Short message to athlete...",
  helperConfirmLevel:
    "Confirm the level from your athlete profile or adjust if needed.",
  feeValidation: "Athlete Fee must be a valid number (0 or greater)",
  feeValidationPositive:
    "Athlete Fee must be greater than 0 when Price Type is not 'Free'",
  inviteHelp:
    "Search athletes by name or email. Selected athletes will receive an event invitation notification after the event is created.",
  fallbackName: "Athlete",
  totalCount: (count: number) => `Total: ${count} athletes`,
} as const;
