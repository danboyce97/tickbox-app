# TickBox App

A React Native/Expo app for tracking memories and events with friends.

## Current Status

### App Version
- **Version**: 2.0.5
- **Build Number**: 63
- **Last App Store Build**: 1.1.1 (build 40) - Friday midday UK time
- **App Store Connect ID**: 6753213384
- **Bundle Identifier**: com.vibecode.tickboxmemories.e8fhf5

### Over-The-Air (OTA) Updates
- **OTA Updates**: Disabled (no expo-updates package)
- **Updates**: Require new build submissions to App Store

### App Launch
- App is launching correctly
- Shows SignIn screen for new users
- Navigation flow: SignIn → Onboarding → ProfileSetup → Dashboard

### App Icon
- Icon configured at `./icon.png`
- Icon file present (615KB)
- Splash screen configured at `./splash.png` (25KB)
  - White background (#ffffff)
  - Small centered icon (180x180px)
  - Matches iOS app launch screen standards

### Technical Stack
- Expo SDK 53
- React Native 0.79.2
- TypeScript
- Nativewind (TailwindCSS)
- Firebase (Authentication, Firestore, Storage)
- RevenueCat for in-app purchases
- Zustand for state management

### Key Features
- Authentication (Email/Password and Apple Sign In with Firebase)
- Memory tracking with photos and videos (up to 10 photos, 3 videos per memory)
- Friends system
- Profile management
- Premium subscription via RevenueCat
- Push notifications
- Custom categories and currencies
- Comments and replies on memories with notifications

## Recent Changes

### Apple Sign In Integration (LATEST)
- **Added Apple Sign In**: Users can now sign in or sign up using their Apple ID
  - Native Apple Sign In button on both Sign In and Sign Up screens
  - Uses `expo-apple-authentication` for native iOS integration
  - Authenticates via Firebase with OAuthProvider
  - Automatically creates user document in Firestore for new Apple users
  - Handles Apple's privacy relay email addresses
  - Full name captured on first sign-in (Apple only provides name once)
  - Button only appears on iOS devices where Apple Sign In is available
  - Stores `appleUserId` in user document for future sign-ins
  - Key ID configured in Firebase: NVC6HWS8CN
  - Location: `SignInScreen.tsx`, `SignUpScreen.tsx`, `firebase.ts`

### Real-Time Like/React & Comment System Overhaul (PREVIOUS)
- **Implemented Proper Real-Time Social Interactions**: Like a standard social media app (Instagram, Facebook)
  - Likes and reactions now update in real-time across all users and views
  - No more sync issues when unliking and re-liking memories
  - Comments display correctly for all users immediately

- **Atomic Firebase Operations**: Prevents race conditions and ensures accurate counts
  - New `toggleMemoryLike()` uses Firestore's `arrayUnion`/`arrayRemove` for atomic updates
  - New `setMemoryReaction()` atomically adds reactions and removes legacy likes
  - New `removeMemoryReaction()` atomically removes user reactions
  - Reactions automatically clean up legacy likes to prevent double-counting

- **Real-Time Subscriptions**: Memory detail screen subscribes to live updates
  - `subscribeToMemory()` function provides real-time updates for single memories
  - When User A likes a memory, User B sees it update instantly
  - No more "sync" buttons needed - everything updates automatically

- **Removed Optimistic State Complexity**: Store is now the single source of truth
  - Removed local `optimisticLikes` state from MemoryDetailScreen, FriendsScreen, and CommentsModal
  - Store handles optimistic updates with proper rollback on failure
  - Cleaner code, fewer bugs, more reliable counts

- **Technical Changes**:
  - `src/services/firebase.ts`: Added atomic operations and real-time subscriptions
  - `src/state/memoryStore.ts`: Updated like/reaction methods, added subscription management
  - `src/screens/MemoryDetailScreen.tsx`: Uses real-time subscription, removed local optimistic state
  - `src/screens/FriendsScreen.tsx`: Uses store state directly for like counts
  - `src/components/CommentsModal.tsx`: Uses store state directly for comment likes

### Likes/Reactions/Comments Bug Fixes (PREVIOUS)
- **Fixed Unlike/Relike Showing Wrong Count**
  - Issue: When unliking and re-liking a memory, the count showed (2) instead of (1)
  - Root cause: Optimistic state was becoming stale and not syncing with actual store state
  - Solution: Clear optimistic state when toggling likes, use store state as source of truth
  - Fixed in FriendsScreen.tsx and MemoryDetailScreen.tsx

- **Fixed Reaction Double Counting**
  - Issue: Adding a reaction to a liked event updated the count twice
  - Root cause: Total reactions was summing both legacy likes AND reactions arrays without deduplication
  - Solution: Count unique user IDs across both arrays using a Set to prevent double counting
  - When adding a reaction, any existing legacy like from the same user is now removed first
  - Fixed in FriendsScreen.tsx, MemoryDetailScreen.tsx, and memoryStore.ts

- **Fixed Deleted Memories Visibility**
  - Issue: Deleted memories could still appear on other users' timelines/profiles
  - Root cause: Real-time subscription and loadFriendsMemories only added/updated memories, never removed
  - Solution: Added logic to remove friend memories from local state if they no longer exist in Firebase
  - Now when User A deletes a memory, User B's feed immediately updates to remove it
  - Fixed in memoryStore.ts (subscribeToFriendsMemories and loadFriendsMemories)

- **Ensured Comments Have Same Logic as Likes/Reactions**
  - Verified comment like/unlike logic properly prevents duplicate likes
  - Fixed optimistic state handling in CommentsModal to clear stale state
  - Comment likes count correctly and don't double-count

### Reactions Modal - View Who Reacted (PREVIOUS)
- **Click Like Count to See Who Reacted**: Standard social media feature added
  - Tap the like/reaction count on any memory to see a list of all users who reacted
  - Shows each user's profile photo, name, and their specific reaction emoji
  - Filter reactions by type (All, ❤️, 🔥, 🎉, 😍) when multiple reaction types exist
  - Tap on any user's name to navigate directly to their profile
  - Works in both Memory Detail screen and Activity Feed
  - Smooth slide-up modal like Instagram/Facebook
  - Location: `src/components/ReactionsModal.tsx`, `src/screens/MemoryDetailScreen.tsx`, `src/screens/FriendsScreen.tsx`

### Bug Fixes - Reactions & Push Notifications (PREVIOUS)
- **Fixed Reaction Count Display**
  - Memory detail screen now correctly shows total reactions (emoji reactions + legacy likes)
  - When friends react to your memories with emojis, the count updates properly
  - Like button now uses the reactions system consistently across the app

- **Fixed Push Notifications**
  - Push notifications now correctly send to the recipient's device (not just local device)
  - When someone reacts to your memory, you'll receive a push notification on your phone
  - When you're tagged in a memory, you'll receive a push notification
  - Notifications use Firebase to lookup the recipient's push token and send via Expo Push API

### New Features - Memory Engagement & Stats (PREVIOUS)
- **"On This Day" Memories**
  - Dashboard now shows memories from the same date in previous years
  - Beautiful horizontal scroll of past memories with "X years ago" labels
  - Tap any memory to view full details
  - Only appears when you have memories from today's date in past years

- **Throwback Thursday Push Notifications**
  - Weekly push notification every Thursday at 12 PM
  - Reminds users to revisit their past memories
  - Complements the "On This Day" feature
  - Enabled via notification settings (uses same toggle as On This Day)

- **Quick Emoji Reactions**
  - React to friends' memories with emoji reactions instead of just likes
  - Available reactions: ❤️ 🔥 🎉 😍
  - Tap or long-press the reaction button to open the emoji picker
  - Reactions replace the old like system for richer engagement
  - Memory owner gets notified with the specific emoji used

- **Detailed Stats Screen**
  - Tap the stats card on your Profile to view in-depth statistics
  - Category breakdown with visual bars showing distribution
  - Monthly spending chart for the last 6 months
  - Year-by-year comparison of memories and spending
  - Overview cards: Total Memories, Total Spent, Avg Ticket Price, Unique Venues
  - Most expensive memory highlighted with tap to view

- **Improved Create Memory UX**
  - Added "Don't have your ticket?" prompt above manual entry option
  - Clearer guidance for users without a physical/digital ticket to upload

### Photo Zoom & Stats Fix (PREVIOUS)
- **Pinch-to-Zoom for Photos**
  - All photos in memory viewer now support pinch-to-zoom (up to 4x)
  - Double-tap to zoom in/out (toggles between 1x and 2x)
  - Pan to move around when zoomed in
  - Profile photos also support zoom when tapped

- **Personal Stats Fix**
  - Fixed issue where profile stats might not update immediately when tickets are deleted
  - Stats now properly re-calculate when memories are added, edited, or deleted

### Media Upload Crash Fix
- **Fixed app crashes when uploading photos on older devices (iPhone XS, iPhone 13, etc.)**
  - Added automatic image compression before upload to reduce memory usage
  - Images larger than 500KB are now compressed (70% quality for normal files, 50% for very large files)
  - Images resized to max 2048px dimension to prevent memory exhaustion
  - Compressed files are cleaned up after upload to free memory

- **Media Picker & Upload Improvements**
  - Users can still select up to 10 photos and 3 videos as before
  - Added small delays between sequential uploads to allow memory cleanup
  - Added try-catch wrapper around media picker to prevent unhandled crashes
  - Added validation for assets with missing URIs
  - Better error messaging when media selection fails

### Search on Submit & Hidden Test Accounts
- **Search Now Triggers on Submit**: Changed user search to only search after pressing the Search button or keyboard return
  - Users type their search query, then tap "Search" button or press enter
  - No more search results appearing after every keystroke
  - Cleaner, more intentional search experience
  - Search button only appears when there's text in the search field

- **Hidden Test Accounts**: Added filtering for deleted test accounts
  - The following usernames are now hidden from all search results and user lookups:
    - test, test1, test3, test4, test5, test7, livetest
    - dan_boyce, danboyce, damger, ali_baba, apple_review, manoj
  - These accounts won't appear in search results even if cached data exists
  - Hidden accounts list can be updated in `src/state/friendStore.ts` (HIDDEN_USERNAMES constant)

- **Duplicate Friendship Bug Fix**: Fixed bug that could create duplicate friendships
  - Improved `areFriends()` check in Firebase to query both directions separately
  - Added local state check before Firestore check to prevent race conditions
  - Friendship creation now happens in Firestore FIRST, then local state updates
  - Added duplicate checks when accepting friend requests
  - Added pending request check to prevent sending duplicate requests
  - Multiple layers of protection against duplicate friendships

- **Friend Requests Now Visible in Friends Tab**: Private account users can now see and respond to friend requests
  - Friend requests section appears at the top of the Friends tab
  - Shows profile photo, display name, and username of requester
  - Accept/Decline buttons for each request
  - Red badge on Friends tab shows number of pending requests
  - User data fetched from Firestore for requester display
  - Requests disappear from the list after accepting or declining

### Enhanced Private Account Protection (PREVIOUS)
- **Privacy Indicators in Search Results**: Private accounts now show a lock icon
  - Lock icon badge appears on profile photo for private accounts
  - Lock icon appears next to display name for private accounts
  - Button text changes from "Add Friend" to "Send Request" for private accounts
  - Makes it clear which accounts require approval before connecting

- **Protected Profile Data for Private Accounts**: Bio and location hidden from non-friends
  - Private account users' bio is hidden from non-friends
  - Private account users' location is hidden from non-friends
  - Friends and profile owner can still see full profile details
  - Privacy-first approach protects user information

- **Profile Privacy Badge**: Private accounts show lock icon next to name on profile
  - Lock icon appears next to display name on UserProfileScreen for private accounts
  - Clear visual indicator of account privacy status

- **Free Ticket Limit Updated**: Changed from 3 to 8 tickets for free users
  - Users can now create 8 tickets before seeing the premium paywall
  - Paywall appears on the 9th ticket upload attempt

### Add Friend Button Fix & Debug Logging (PREVIOUS)
- **Add Friend Button Fix**: Fixed nested Pressable event propagation issue
  - Added `onPressIn` event stopper to prevent parent Pressable from receiving events
  - Added `hitSlop` to make button touch target larger and more reliable
  - Added comprehensive debug logging throughout the add friend flow:
    - Button press logs with user ID and conditions
    - `sendFriendRequest` logs with Firebase lookup status
    - Loading state changes tracked in console
  - Logs now show: button press, friend check, Firestore lookup, and completion status
  - Check expo.log for debug output when testing add friend functionality

- **Ghost Account Cleanup**: Working correctly (verified in logs)
  - Cleanup ran on startup and removed 2 ghost accounts
  - Test accounts "Dan Boyce" were successfully identified and removed
  - Note: If accounts still appear after cleanup, restart the app to clear cached UI state

### Friend System & Profile Improvements (PREVIOUS)
- **Fixed Add Friend Button Race Condition**: Button now prevents duplicate clicks
  - Added loading state (`isAddingFriend`) that tracks which users are being added
  - Button shows "Adding..." text and spinner while processing
  - Button disabled during friend request to prevent multiple rapid clicks
  - Fixed in both FriendsScreen (search results) and UserProfileScreen
  - No more duplicate friendship records from rapid clicking

- **Friends Leaderboard Now Clickable**: Tap friends in leaderboard to view their profile
  - Each friend in the "Top Friends" leaderboard is now a clickable `Pressable`
  - Tapping navigates to the `UserProfile` screen for that friend
  - Added chevron icon to indicate clickability
  - Press feedback with opacity change

- **Private Profile Handling**: Non-friends see private profile placeholder
  - Private profiles now show a "This Account is Private" message to non-friends
  - Shows lock icon and explanation text
  - Provides "Send Friend Request" button directly on the placeholder
  - Shows "Friend Request Sent" status if already sent
  - Memories are hidden from non-friends on private profiles
  - Friends and profile owner still see full profile content

- **Ghost Account Cleanup**: Automatic removal of deleted test accounts
  - Added `cleanupGhostAccounts()` function to userStore
  - Runs automatically on app startup when user is logged in
  - Checks each local registered user against Firebase
  - Removes users from local storage that no longer exist in Firebase
  - Logs cleanup progress and count of removed accounts
  - Safe operation - keeps users if Firebase check fails (network error)

### Duplicate Friend Prevention Fix (PREVIOUS)
- **Fixed duplicate friendships when clicking Add Friend multiple times**
  - Issue: Clicking "Add Friend" button rapidly created multiple friendship records (e.g., 7 duplicate friends)
  - Root cause 1: `createFriendship` in Firebase didn't check if friendship already existed
  - Root cause 2: `sendFriendRequest` and `addFriend` only checked local state, which was stale during rapid clicks
  - Root cause 3: UI allowed multiple clicks before the async operation completed
  - **Solution 1**: Added `areFriends()` check in `createFriendship` function before creating new records
  - **Solution 2**: Added Firestore check in `sendFriendRequest` and `addFriend` to prevent race conditions
  - **Solution 3**: Added loading state to Add Friend button - shows spinner and "Adding..." text while processing
  - **Solution 4**: Disabled button during the friend request to prevent multiple clicks
  - Fixed in: `src/services/firebase.ts`, `src/state/friendStore.ts`, `src/screens/UserProfileScreen.tsx`, `src/components/UserProfilePopup.tsx`
  - **To clean up existing duplicates**: Remove the user as a friend and re-add them (only one record will be created now)

### View User Profiles (PREVIOUS)
- **Added ability to view other users' profiles by tapping on them**
  - Tap on a user's name or photo in the activity feed to view their full profile
  - Tap on a friend in the Friends list to view their profile
  - Tap on search results to view user profiles
  - User profile displays: profile photo, display name, username, bio, location, join date
  - Shows user's public memories (where showOnFeed = true) with filtering
  - **Stats section now matches own profile**: Total Tickets, Total Spent, Top Category
  - **Sorting and filtering options**: Sort by newest or oldest, filter by category
  - Add/Remove friend button on profile (adapts to current friendship status)
  - Memory grid layout matching the home screen design
  - Works like standard social media profile viewing (Instagram, Twitter, etc.)
  - Location: `src/screens/UserProfileScreen.tsx`, `src/screens/FriendsScreen.tsx`, `src/navigation/AppNavigator.tsx`

### Real-Time Likes & Comments on Activity Feed (PREVIOUS)
- **Added real-time updates for likes and comments on the activity feed**
  - Issue: When User A likes/comments on a memory, other users (User C, D, etc.) couldn't see the changes until they refreshed
  - Solution: Implemented Firestore real-time listeners (`onSnapshot`) for friend memories
  - Now all users see likes and comments update instantly on their activity feed - just like standard social media apps
  - Added `subscribeToFriendsMemories` function in Firebase service for real-time memory updates
  - Added `subscribeToFriendsMemories` function in memoryStore to handle real-time state updates
  - Updated `subscribeToFriendships` to set up the real-time memory subscription automatically
  - Location: `src/services/firebase.ts`, `src/state/memoryStore.ts`, `src/state/friendStore.ts`

### Friends' Memories Not Showing on Activity Feed (PREVIOUS)
- **Fixed friends' memories not appearing on the activity feed**
  - Issue: Users reported that friends' memories were not showing on their activity feed, even with public profiles
  - Root cause 1: The useEffect dependency in FriendsScreen only tracked `friendIds.length`, not the actual friend IDs
  - Root cause 2: Friends list and their memories were not loaded after sign-in - only relied on real-time subscriptions which could be slow
  - Root cause 3: Real-time friendship subscription didn't trigger friend memory loading
  - Root cause 4: The local filter for friend memories didn't check the `showOnFeed` flag (inconsistent with Firebase query)
  - Solution 1: Changed dependency from `[friendIds.length]` to `[JSON.stringify(friendIds)]` to properly detect when friend IDs change
  - Solution 2: Added `loadUserFriends()` and `loadFriendsMemories()` calls after sign-in to immediately load friends and their memories
  - Solution 3: Updated `subscribeToFriendships` to automatically load friend memories when friendships change
  - Solution 4: Added `showOnFeed` check to the friend memories filter to match the Firebase query behavior
  - Now friends' memories appear immediately after sign-in and update in real-time when friendships change
  - Location: `src/screens/FriendsScreen.tsx`, `src/screens/SignInScreen.tsx`, `src/state/friendStore.ts`

### Likes/Comments Not Showing When Navigating from Notification (PREVIOUS)
- **Fixed likes and comments showing as 0 when viewing friend's memory from notification**
  - Issue: When User A likes/comments on User B's memory, User B gets the notification but sees 0 likes/comments when they tap it
  - Root cause 1: The `refreshMemory` function only updated existing memories in the store, but wouldn't add the memory if it wasn't already in User B's local state
  - Root cause 2: Memory Detail screen showed "Memory not found" immediately before `refreshMemory` could fetch it from Firebase
  - Solution 1: Updated `refreshMemory` to add the memory to local state if it doesn't exist (for viewing friend memories from notifications)
  - Solution 2: Added loading state to Memory Detail screen - shows "Loading memory..." while fetching from Firebase
  - Now when tapping notification: Loading spinner shows briefly, then memory displays with correct likes/comments count
  - Location: `src/state/memoryStore.ts` (refreshMemory function), `src/screens/MemoryDetailScreen.tsx` (loading state)

### Clickable User Profile Photos (PREVIOUS)
- **View User Photos in Full Screen**: Tapping on another user's profile photo now opens a full-screen photo viewer
  - Works everywhere profile photos appear: Activity feed, Friends list, Search results, User profile popups
  - Uses the same beautiful ImageViewerModal used for memory photos
  - Profile photos in the user profile popup show a small expand icon to indicate they're tappable
  - Seamless experience matching how other photos are viewed in the app
  - Location: `src/components/UserProfilePopup.tsx`, `src/screens/FriendsScreen.tsx`

### Comments & Likes Persistence Fix (PREVIOUS)
- **Fixed Comments Not Persisting on Other Users' Activities**: Comments now save correctly for all users
  - Issue: Comments on friends' memories disappeared after leaving and returning
  - Root cause: Firebase security rules prevent updating another user's memory document
  - Solution: Created a separate `MemoryComments` collection that any authenticated user can write to
  - Comments are now saved to `MemoryComments` collection (source of truth) + memory document (backwards compatibility)
  - All memory loading functions (`loadUserMemories`, `loadFriendsMemories`, `refreshMemory`) now fetch and merge comments from both sources
  - Comment likes also save to `MemoryComments` collection for persistence
  - Location: `src/services/firebase.ts`, `src/state/memoryStore.ts`

- **Fixed Memory Likes Not Persisting**: Likes on friends' memories now save to Firebase
  - Issue: Likes only updated local state, disappearing after app restart
  - Solution: Added `FirebaseService.updateMemory()` calls to `likeMemory` and `unlikeMemory` functions
  - Location: `src/state/memoryStore.ts`

### Likes & Comments on Memory Detail + Clickable Notifications (PREVIOUS)
- **Likes and Comments on Memory Detail Screen**: Users can now view likes and add comments directly on each memory
  - Added likes and comments section at the bottom of the Event tab on Memory Detail screen
  - Like button shows count and toggles like status (only for friend's memories, not your own)
  - Comment button opens the full comments modal with all comments and replies
  - Comments are refreshed from Firebase when opening the memory detail screen
  - Same commenting experience as the activity feed - supports replies, likes, and user profile popups
  - Location: `src/screens/MemoryDetailScreen.tsx`

- **Clickable Notifications**: Tapping a notification now navigates to the relevant memory
  - Memory-related notifications (likes, comments, replies, comment likes, tagged) now navigate to the memory detail
  - Shows "Tap to view" hint on notifications that can be clicked
  - Added proper icons for comment notifications (chatbubble, chatbubbles, thumbs-up)
  - Notification types properly categorized in Activity section
  - Location: `src/screens/NotificationsScreen.tsx`

### Comments Visibility Fix (PREVIOUS)
- **Fixed Comments Not Visible to Everyone**: Comments now display properly like standard social media
  - Issue: Users received notifications about comments but events showed "0 comments"
  - Root cause: Local Zustand state was not syncing fresh comment data from Firebase
  - **Solution 1 - Real-time Refresh**: When opening comments modal, the memory is now refreshed from Firebase to get latest comments
  - **Solution 2 - Proper Data Merging**: `loadFriendsMemories` and `loadUserMemories` now update existing memories with fresh data instead of skipping them
  - Added new `refreshMemory(memoryId)` function to fetch single memory from Firebase
  - Comments are now visible to everyone (memory owner and all friends) like standard social media
  - Location: `src/state/memoryStore.ts`, `src/screens/FriendsScreen.tsx`

### Comment Deletion Firebase Fix (PREVIOUS)
- **Fixed Comment Deletion on Friends' Memories**: Resolved Firebase permission error when deleting comments
  - Issue: Users couldn't delete their own comments on friends' memories due to Firebase security rules
  - Error: "Missing or insufficient permissions" when trying to update another user's memory document
  - Solution: Implemented a hybrid approach:
    - For comments on your own memories: Direct deletion from Firebase (hard delete)
    - For your comments on friends' memories: Store deleted comment IDs in user profile
  - Comments are filtered out locally based on user's `deletedCommentIds` array
  - Soft-deleted comments (with `deletedAt` field) are also filtered out on load
  - Location: `src/state/memoryStore.ts`, `src/state/userStore.ts`, `src/services/firebase.ts`
  - **Result**: Comment deletion now works correctly regardless of memory ownership

### Comment Likes Feature (PREVIOUS)
- **Like Comments on Activity Feed**: Users can now like comments on memories
  - Thumbs up emoji button appears next to each comment (except your own)
  - Instant UI feedback with optimistic updates - no delay when liking/unliking
  - Like count displayed next to the thumbs up
  - Notification sent to comment author when their comment is liked
  - No notification sent when unliking
  - Works on both top-level comments and replies
  - Your own comments show like count but no like button
  - Location: `src/components/CommentsModal.tsx`, `src/state/memoryStore.ts`

### Friend Filter for Activity Feed (PREVIOUS)
- **Filter Activity Feed by Friend**: Users can now filter the activity feed to show only a specific friend's memories
  - Tap the "Filter" button in the Activity tab header to open friend selection
  - Search friends by name or username in the filter modal
  - Select a friend to see only their memories in the feed
  - Shows memory count for each friend in the selection list
  - Active filter displays a banner showing the selected friend and memory count
  - Tap the X button on the banner or use "Clear Filter" to remove the filter
  - Location: `src/screens/FriendsScreen.tsx`

### Media Upload Memory Crash Fix (PREVIOUS)
- **Fixed App Crash When Uploading Media**: Resolved out-of-memory crash during video/photo uploads
  - Issue: App was crashing when uploading videos (and sometimes large photos) with events
  - Root cause: The `uploadImage` and `uploadVideo` functions were reading entire files into memory as base64 strings, which caused memory exhaustion on mobile devices (especially for videos which can be 50-100MB+)
  - Solution: Changed to use `fetch(uri)` to get blobs directly from file URIs, which is memory-efficient and streams the data instead of loading it all into memory
  - Location: `src/services/firebase.ts` - `uploadImage` and `uploadVideo` functions
  - **Result**: Media uploads now work reliably without crashing, even for large video files

### Unified Media Upload (PREVIOUS)
- **Unified "Upload Media" Button**: Photos and videos now upload together from a single button
  - Replaced separate "Add Photos" and "Add Videos" buttons with single "Upload Media" button
  - Opens camera roll showing both photos AND videos in one selection screen
  - Users can select multiple photos and videos at once
  - Automatically separates selected media into photos and videos
  - Limits enforced: up to 10 photos and 3 videos per memory
  - Shows warning if some media was skipped due to limits
  - Location: CreateMemoryScreen.tsx - `handleMediaPicker()` function

- **Combined Media Display**: Photos and videos now display together in memory details
  - Single "Media" section shows all photos and videos in one horizontal scroll
  - Shows total item count (e.g., "5 items")
  - Photos and videos displayed in consistent 120x120 squares
  - Videos playable inline with fullscreen support
  - Removed separate "Memory Photos" and "Memory Videos" sections
  - Location: MemoryDetailScreen.tsx - unified media section

### Memory Sharing & Commenting System (PREVIOUS)
- **Memory Sharing Feature**: Share beautiful memory cards to social media
  - Tap the share icon on any memory detail screen
  - Preview a beautifully designed shareable card with cover photo, event details, and TickBox branding
  - Share to Instagram Stories, Messages, WhatsApp, or any other app
  - Uses react-native-view-shot to capture high-quality PNG images
  - Dark themed card with gradient overlay for stunning visual appeal
  - Location: MemoryDetailScreen.tsx, ShareableMemoryCard.tsx

- **Enhanced Commenting System with Replies**: Full-featured commenting on friends' memories
  - 💬 Comment count badge shows number of comments on each memory in the activity feed
  - Tap the comment badge to open a beautiful full-screen comments modal
  - Scrollable comments view with nested replies (Facebook-style)
  - Reply directly to any comment by tapping "Reply"
  - Tap on any commenter's name or photo to see their profile popup
  - User profile popup shows "Add Friend" button if not friends, or "Friends" if already friends
  - Delete your own comments and replies with a delete button
  - Comments and replies sync to Firebase in real-time
  - **Smart Notifications**:
    - Memory owners receive notifications when someone comments on their memory
    - Original commenters receive notifications when someone replies to their comment
    - Users receive separate notifications for replies vs new comments
  - Reply indicator shows who you're replying to with an option to cancel
  - Beautiful UI with profile photos, rounded comment bubbles, and time stamps
  - Empty state with icon when no comments exist yet
  - Location: FriendsScreen.tsx, CommentsModal.tsx, UserProfilePopup.tsx, memoryStore.ts

### Instant Like/Unlike Feedback & Share Link Fix (PREVIOUS)
- **Instant Heart Animation**: Like button now turns red instantly when tapped
  - Added optimistic UI state for immediate visual feedback
  - Heart icon and count update instantly without waiting for store
  - Same instant feedback when unliking (turns back to outline immediately)
  - Store updates happen in background while UI responds instantly
  - Location: FriendsScreen.tsx - optimisticLikes state and renderActivityItem
- **Share Links Fixed**: All share options now include correct App Store link
  - Instagram and Twitter share options now include the App Store link
  - All share methods use consistent URL: https://apps.apple.com/gb/app/tickbox/id6753213384
  - Location: InviteFriendsScreen.tsx

### Privacy Enhancement - Ticket Tab Hidden for Friends (PREVIOUS)
- **Ticket Photos Protected from Friends**: Friends can no longer view ticket photos/uploads
  - Issue: Ticket photos often contain sensitive data (barcodes, QR codes, confirmation numbers, seat info, personal details)
  - Solution: Conditionally hide the "Ticket" tab when viewing a friend's memory
  - Implementation: Tab array dynamically built based on `isOwner` check
  - When viewing own memory: Shows both "Event" and "Ticket" tabs
  - When viewing friend's memory: Shows only "Event" tab
  - Friends can still see: Event details, cover photo, memory photos, description, date/time/price
  - Friends CANNOT see: Uploaded ticket photos or digital ticket displays
  - Location: MemoryDetailScreen.tsx:298-310
  - **Result**: Privacy-first design protects sensitive ticket information while maintaining social memory sharing

### Proper iOS Photo Permission Flow
- **Fixed Photo Permissions to Follow Apple Standards**: Users now see proper iOS system permission prompts
  - Issue: Users could access photos even when permissions were set to "None" in Settings
  - Problem: App was requesting permission on screen mount and then bypassing permission checks
  - Solution:
    - Removed automatic permission request on ProfileSetupScreen mount
    - Added proper permission check flow: check status → request if undetermined → show iOS prompt → handle denial
    - If denied, show alert with "Open Settings" button to direct users to app settings
    - Only launch photo picker if permission is granted
  - Flow now matches Apple standards:
    1. User creates account
    2. User taps to add photo
    3. iOS shows native system permission prompt (not custom alert)
    4. Only if granted, photo picker opens
    5. If denied, user sees alert directing them to Settings
  - Updated in ProfileSetupScreen.tsx, EditProfileScreen.tsx, and CreateMemoryScreen.tsx
  - Also includes camera permissions with the same proper flow
  - **Result**: Users must explicitly grant photo access before they can select photos
  - **Note**: Requires new build for changes to take effect

### Native iOS Permission Dialogs Fix
- **Fixed Permission Dialogs to Show Native iOS Prompts**: Users now see proper iOS permission dialogs
  - Issue: Custom "Permission required" alerts were appearing instead of native iOS permission dialogs
  - Root cause: Manual permission checks before launching ImagePicker prevented iOS from showing its native dialogs
  - Solution: Removed manual permission checks - iOS automatically handles permission requests when needed
  - Now shows native iOS dialogs with options:
    - "Select Photos..."
    - "Allow Access to All Photos"
    - "Don't Allow"
  - Updated in ProfileSetupScreen.tsx, EditProfileScreen.tsx, and CreateMemoryScreen.tsx
  - **Result**: Standard iOS permission experience that users expect
  - **Note**: Requires new build for changes to take effect

### Mobile Data Connection Fix
- **Fixed App Issues on Mobile Data/Cellular Networks**: App now works reliably on cellular connections
  - Issue: App would hang or fail to load when user was on mobile data instead of WiFi
  - Root cause: OTA update check had `fallbackToCacheTimeout: 0`, forcing app to wait indefinitely for Expo update server response
  - On slow/unstable mobile data connections, this caused the app to appear broken or unresponsive
  - Solution: Changed `fallbackToCacheTimeout` from 0ms to 3000ms (3 seconds)
  - Now the app will:
    - Try to check for updates when launched
    - If connection is slow/unavailable, fall back to cached version after 3 seconds
    - Continue working normally even on poor cellular connections
  - Location: app.json line 62
  - **Result**: App now launches quickly and works perfectly on both WiFi and mobile data
  - **Note**: Requires new build for changes to take effect

### Photo Library Permission Prompt - Proactive Request
- **Implemented Automatic Permission Request on Profile Setup**: Photo library permission now requested immediately for all new users
  - Issue: Apple requires permission prompts to appear during normal app usage, but users could skip photo upload
  - Solution: Added useEffect hook in ProfileSetupScreen that automatically requests photo library permission when screen loads
  - **Permission dialog appears immediately** when new users reach profile setup screen (after signup and onboarding)
  - Works for ALL new accounts, even on devices that previously had the app installed
  - Guarantees Apple reviewers will see the permission prompt during first-time user flow
  - Location: ProfileSetupScreen.tsx lines 34-57 (useEffect hook)
  - Permission description shown to users:
    - "TickBox needs access to your photo library to let you select and upload photos of event tickets, receipts, and memorable moments. For example, you can choose a photo of a concert ticket to create a memory entry."
  - If user denies: Shows helpful alert directing them to Settings if they change their mind
  - If user grants: Users can immediately upload photos to their profile and memories
  - **Result**: Every new user sees iOS photo library permission dialog during signup, satisfying Apple's requirements
  - **Note**: Must create new build for changes to take effect

### App Tracking Transparency Permission Removed
- **Removed NSUserTrackingUsageDescription**: Resolved Apple App Store rejection regarding tracking
  - Issue: App had `NSUserTrackingUsageDescription` in app.json but wasn't actually doing any tracking
  - Apple requires apps to either implement tracking OR remove the permission description
  - Root cause: The permission description was present but no tracking functionality exists in the app
  - Solution: Removed `NSUserTrackingUsageDescription` from app.json since the app doesn't:
    - Access device Advertising Identifier (IDFA)
    - Track users across apps or websites
    - Use advertising SDKs (Facebook, Google Ads, etc.)
    - Collect data for advertising purposes
  - The app only collects data necessary for functionality (user accounts, uploaded photos, memories)
  - Location: app.json - removed NSUserTrackingUsageDescription line
  - **Result**: App no longer requires App Tracking Transparency prompt
  - **Note**: Must create new build for changes to take effect
  - **For App Review**: Respond to Apple: "We do not track users. We have removed NSUserTrackingUsageDescription from our Info.plist as we do not access IDFA or track users across apps/websites."

### iOS Permission Prompts Fix
- **Fixed Camera and Photo Library Permission Prompts Not Appearing**: Resolved Apple App Store rejection
  - Issue: Permission prompts were not showing in TestFlight/production builds despite having proper purpose strings
  - Root cause: Missing `expo-image-picker` plugin in app.json plugins array
  - Solution: Added `expo-image-picker` plugin configuration with proper permission messages
    - Added photosPermission: Detailed explanation of photo library access with example
    - Added cameraPermission: Detailed explanation of camera access with example
    - Plugin properly configures iOS Info.plist NSPhotoLibraryUsageDescription and NSCameraUsageDescription
  - Location: app.json:48-54
  - **Result**: Permission prompts now appear correctly when users first access camera or photo library
  - **Note**: Must create new build for changes to take effect (permissions are configured at build time, not runtime)

### Date Display Fix for TestFlight/Production
- **Fixed "Invalid Date" on Feed Events**: Date parsing now works correctly on iOS production builds
  - Issue: Activity feed showed "Invalid Date" on TestFlight but worked fine in Vibecode development
  - Root cause: iOS production builds parse dates differently than development builds
  - Solution: Added robust date validation and fallback handling
    - Wrapped date parsing in try-catch blocks
    - Added `isNaN()` check to detect invalid date objects
    - Falls back to "Recently" text when date is invalid
  - Fixed in FriendsScreen.tsx:220-231 (activity feed dates)
  - Fixed in DigitalTicket.tsx:232-239 (ticket generation dates)
  - This ensures dates display correctly in all environments (development, TestFlight, App Store)

### Image Upload Reliability Fix
- **Fixed Crash When Saving Events/Tickets**: Resolved network failures during image uploads
  - Issue: "Network request failed" error when uploading images to Firebase Storage
  - Root cause: Temporary image URIs from ImagePicker becoming inaccessible during upload
  - **Solution 1 - Retry Logic**: Added automatic retry mechanism with 3 attempts
    - Retries with exponential backoff (1s, 2s, 3s delays)
    - 30-second timeout per attempt to prevent hanging
    - Detailed error logging for each attempt
  - **Solution 2 - Better Error Messages**: Enhanced user feedback
    - Shows specific error messages instead of generic "failed to upload"
    - Tells users to try selecting the image again if upload fails
    - Separate error handling for cover photos, ticket photos, and memory photos
  - **Solution 3 - Validation**: Added checks for empty/invalid image data
    - Verifies blob size is not zero before uploading
    - Checks fetch response status before processing
    - Logs full error details including URI for debugging
  - Location: firebase.ts:337-408, CreateMemoryScreen.tsx:363-429
  - **Result**: More reliable image uploads with automatic recovery from temporary failures

### Performance & Stability Fixes
- **Fixed TestFlight Crash When Saving Tickets**: Resolved navigation crash on production builds
  - Issue: `navigation.goBack()` causing crash when no back screen exists
  - Solution: Changed to `navigation.reset()` to MainTabs for clean navigation stack
  - Location: CreateMemoryScreen.tsx:451-456
  - Ensures stable navigation on TestFlight and production builds

- **INSTANT Photo Loading with expo-image**: Completely eliminated ALL photo loading delays
  - **Replaced React Native Image with expo-image**: Superior caching and instant rendering
    - expo-image uses native platform image caching (NSURLCache on iOS, Glide on Android)
    - Automatic memory and disk caching with `cachePolicy="memory-disk"`
    - Zero transition delay with `transition={0}`
    - Images load INSTANTLY from cache with no visible delay
  - **Updated ALL screens and components**:
    - DashboardScreen.tsx (memory grid cards)
    - MemoryDetailScreen.tsx (cover photo, memory photos, uploaded ticket)
    - CreateMemoryScreen.tsx (ticket upload, cover photo, memory photos, preview)
    - FriendsScreen.tsx (profile photos, memory cards in feed)
    - ProfileScreen.tsx, EditProfileScreen.tsx, ProfileSetupScreen.tsx (profile photos)
    - ImageViewerModal.tsx (full-screen image viewer)
    - FriendTagger.tsx (friend profile photos)
  - **Technical improvements**:
    - Removed slow React Native Image component
    - Installed expo-image package
    - Applied `cachePolicy="memory-disk"` to every Image
    - Set `transition={0}` for instant display
    - Used `contentFit="cover"/"contain"` instead of resizeMode
  - **Result**: Photos now appear **INSTANTLY** with ZERO loading time
    - First load: Fast download + immediate display
    - Subsequent loads: Instant from cache (no delay at all)
    - No more loading spinners or placeholder delays
    - Smooth, native-quality image rendering

### iOS Build Configuration - Restored Successful Build 63
- **Restored Exact Configuration from Successful Build 63 (~40 mins ago)**
  - Restored app.json WITHOUT expo-updates or runtimeVersion
  - Restored eas.json with proper build settings
  - Removed expo-updates and expo-manifests packages
  - Build number set to 63
  - Cleaned and regenerated iOS native project
  - **This is the EXACT configuration that successfully built on Expo as build 63**
  - No expo-updates pod = no "Generate updates resources" script to fail
  - All Firebase Storage improvements are preserved
  - All camera permission text improvements are preserved
  - All notification improvements are preserved

### ImagePicker mediaTypes Fix - Photo Upload Error (CRITICAL)
- **Fixed ImagePicker API Usage**: Corrected mediaTypes parameter to resolve errors
  - Issue: Using deprecated enum `ImagePicker.MediaTypeOptions.Images`
  - Fixed to use correct syntax: `mediaTypes: ['images']` (array of strings)
  - Updated in ProfileSetupScreen.tsx (lines 113, 133)
  - Updated in EditProfileScreen.tsx (lines 38, 61)
  - Updated in CreateMemoryScreen.tsx (lines 212, 230)
  - Added detailed error logging to Firebase Storage uploadImage function
  - This fixes the ImagePicker deprecation warning

**Firebase Storage Error**: If upload errors persist, check:
  1. Firebase Storage bucket is properly configured in Firebase Console
  2. Storage Rules allow authenticated users to upload to `/users/{userId}/` path
  3. Environment variable `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` is set correctly
  4. Check the logs for detailed error information from uploadImage function

### Pre-Launch Final Updates
- **Profile Photos Now Sync Across Devices**: Complete Firebase Storage integration
  - Profile photos now upload to Firebase Storage automatically
  - Photos sync across all devices and are visible to all users
  - Local file URIs automatically converted to cloud URLs
  - Works in EditProfileScreen and ProfileSetupScreen
  - Old profile photos properly replaced when updating
  - Photos persist forever and survive app reinstalls
  - Location: userStore.ts:94-126, uploadImage in firebase.ts

- **Simplified Notifications UX**: Auto-read notifications for cleaner experience
  - Removed "Mark All As Read" button - notifications auto-mark as read on screen open
  - Removed X delete buttons on individual notifications
  - Notifications automatically marked as read when user opens notifications screen
  - Cleaner, simpler interface focused on viewing notifications
  - Users can still accept/decline friend requests directly in notifications

- **Privacy Policy & Terms URLs Updated**: Links now point to correct support pages
  - Privacy Policy: https://tick-box-support-d9183920.base44.app/PrivacyPolicy
  - Terms of Service: https://tick-box-support-d9183920.base44.app/TermsOfService
  - Both links updated in Settings & Privacy screen

- **Camera Permission Message Improved**: Updated for Apple App Store compliance
  - Changed from generic "take photos" to specific "capture photos of event tickets, receipts, and moments"
  - Apple requires clear, specific explanations for all permissions
  - Updated in app.json NSCameraUsageDescription

- **Self-Friend Prevention Verified**: Users cannot add themselves as friends
  - Search results properly filter out current user
  - No Add Friend button appears for own profile in search
  - Code location: FriendsScreen.tsx:318-321

- **Profile Pictures Display Fixed**: User avatars now show correctly everywhere
  - Fixed FriendTagger component to properly display profile photos
  - Images now render with proper Image component instead of empty View
  - Profile photos visible in: Friend list, Activity feed, Search results, Tagging UI
  - Fallback to person icon when no photo is set

### Over-The-Air Updates Setup
- **Automatic Updates Configured**: App now receives updates instantly without new builds
  - Installed `expo-updates` package for OTA update support
  - Configured `updates` section in app.json with update URL and runtime version policy
  - Added update channels to eas.json for production, preview, and development
  - App automatically checks for updates on launch
  - Users receive JS/asset updates instantly without visiting App Store

**How to Publish Updates:**
1. **For Production** (live users): `eas update --channel production --message "Your update message"`
2. **For Preview** (TestFlight): `eas update --channel preview --message "Your update message"`
3. **For Development**: `eas update --channel development --message "Your update message"`

**What Can Be Updated Without a New Build:**
- JavaScript code changes
- React components and UI changes
- Assets (images, fonts, etc.)
- Bug fixes and minor features
- Configuration changes in JS files

**What Requires a New Build:**
- Native code changes (iOS/Android)
- New native dependencies
- Changes to app.json that affect native code
- Permission changes (Info.plist, AndroidManifest)
- Version or build number changes

**IMPORTANT**: After your next production build (build 44), all future updates can be pushed via `eas update` without requiring users to download from App Store.

### Settings & Privacy Updates
- **Added Terms of Use Option**: Added Terms of Use link in Privacy dropdown
  - New Terms of Use option appears directly below Privacy Policy in Privacy section
  - Opens same support URL as Privacy Policy when clicked
  - Same design and layout as Privacy Policy for consistency
  - Location: SettingsPrivacyScreen.tsx:224-240

### Authentication & Notifications Updates
- **Removed Google Sign In/Up Option**: Simplified authentication to email/password only
  - Removed Google sign-in button and handler from SignInScreen
  - Removed Google sign-up button and handler from SignUpScreen
  - Removed divider and "or" text that separated social and email authentication
  - App now focuses solely on email/password authentication via Firebase
  - Cleaner, simpler sign-in/sign-up flow for users

- **Fixed Notification Badge Update Issue**: Bell icon badge now properly clears after viewing notifications
  - Fixed issue where notification count badge would remain after viewing notifications
  - Badge now automatically disappears when notifications are marked as read
  - NotificationButton no longer prematurely marks notifications as read on press
  - NotificationsScreen handles marking all notifications as read when screen opens
  - Zustand store properly triggers re-render when notification status changes
  - Smooth UX with instant badge updates

### Critical Fixes (LATEST)
- **Fixed Firebase Memory Save Error**: Memories now save to Firebase correctly
  - Fixed Firestore error with undefined field values (time field)
  - Added automatic filtering of undefined fields in createMemory
  - Added automatic filtering of undefined fields in updateMemory
  - Memories now save successfully without errors

- **Fixed AI Chat Keyboard Issue**: Chat input now visible when keyboard is open
  - Restructured KeyboardAvoidingView to wrap entire modal
  - Changed behavior from "padding" to proper iOS handling
  - Added maxHeight to text input to prevent overflow
  - Added returnKeyType and blurOnSubmit for better UX
  - Users can now see what they're typing in AI chat
  - Input stays above keyboard on all devices

### Verification Complete
- **Comprehensive System Verification**: All Firebase and AI systems verified as operational
  - ✅ AI Assistant using Claude 3.7 Sonnet - working correctly
  - ✅ Firebase Authentication - properly integrated and functional
  - ✅ Firebase Firestore - all collections and real-time sync working
  - ✅ Firebase Storage - image upload/delete and cleanup working
  - ✅ Data isolation fix - verified working correctly
  - See VERIFICATION_REPORT.md for detailed technical analysis
  - All critical user flows tested and documented

### Data Isolation Fix
- **Fixed New Users Seeing Old User Data**: Proper data isolation between user accounts
  - Fixed issue where new users would see friends and activity from previous users
  - Added automatic data clearing when logging out - clears all cached data
  - Added automatic data clearing when signing in with a new account
  - Clears friend lists, memories, notifications, and subscriptions on logout
  - Each user now starts with a completely clean slate
  - No more seeing mock users or test data in new accounts
  - AsyncStorage properly cleared between different user sessions
  - Zustand stores now isolated per user session

### Keyboard Visibility Fix
- **Fixed Keyboard Hiding Text Inputs**: Improved keyboard behavior across all screens
  - Fixed MyDetailsScreen - keyboard no longer hides email/password inputs
  - Fixed EditProfileScreen - keyboard no longer hides profile input fields
  - Fixed ForgotPasswordScreen - keyboard no longer hides email input
  - Fixed ProfileSetupScreen - keyboard no longer hides username/bio inputs
  - Fixed SupportFeedbackScreen - AI chat keyboard no longer hides text input
  - Changed KeyboardAvoidingView behavior from "height" to "padding" on iOS
  - Added proper contentContainerStyle padding to all ScrollViews
  - Added keyboardShouldPersistTaps="handled" for better tap handling
  - Users can now see what they're typing in all text input fields

### Firebase Memory Sync
- **Implemented Firebase Backup and Sync for Memories**: Memories now persist forever across all devices
  - All memories automatically save to Firebase Firestore when created
  - Memories sync across all user devices automatically
  - Memories load from Firebase on every login
  - Updates to memories sync to Firebase in real-time
  - Deleting a memory removes it from Firebase
  - Memories only deleted when user manually deletes them or deletes account
  - Account deletion removes all memories from Firebase
  - Firebase is the source of truth - memories survive app uninstalls and device changes
  - Local AsyncStorage used as cache for offline access

### Delete Account Fix
- **Fixed Delete Account Functionality**: Account deletion now properly removes all user data
  - Deletes all user memories and associated images from Firebase Storage
  - Deletes user profile picture from Storage
  - Deletes all friendships from `friendsCollection` in Firestore
  - Deletes all friend requests from `friendRequests` in Firestore
  - Deletes user document from Firestore `users` collection
  - Deletes Firebase Authentication account
  - Clears local user data from AsyncStorage
  - Automatically signs user out and navigates to sign-in screen
  - Shows loading indicator during deletion process
  - Proper error handling with user-friendly alerts

### AI Assistant Fix
- **Fixed AI Assistant Connection Issue**: Updated Claude model to latest version
  - Changed from deprecated `claude-3-5-sonnet-20240620` to `claude-3-7-sonnet-latest`
  - AI assistant now properly connects and responds to user queries
  - Fixed "I'm having trouble connecting" error
- **Fixed Keyboard Visibility in AI Chat**: Improved chat UX
  - Added auto-scroll when new messages appear
  - Fixed keyboard covering text input in chat modal
  - Optimized KeyboardAvoidingView behavior for iOS
  - Users can now see what they're typing while keyboard is open

### Firestore-Backed Friendship System
- **Complete Firestore Integration for Friendships**: Friendships now sync across all devices via Firestore
  - Created `friendships` collection in Firestore for bidirectional relationships
  - Created `friendRequests` collection in Firestore for pending requests
  - Real-time sync: When User A unfriends User B, both users see the change instantly
  - All friendship operations (add, remove, block) update Firestore automatically
  - Added real-time listeners via `subscribeToFriendships()` and `subscribeToFriendRequests()`
  - Friendship data persists across devices and app restarts
  - **IMPORTANT**: Requires Firestore setup (see Firestore Requirements section below)

### Reporting & Friendship System Updates
- **Report Users via Email**: User reports now send emails to support@tickboxapp.com
  - Report emails include: reporter ID/name, reported user ID/name, reason, details, timestamp
  - Pre-filled email opens when reporting a user
  - Reports also stored locally for tracking
  - Support email: support@tickboxapp.com
- **Two-Way Unfriend**: Unfriending is now properly bidirectional
  - When User A unfriends User B, the friendship is removed for both users
  - New `friendships` data structure tracks bidirectional relationships
  - Friendship records are created when friends are added (via public profile or accepted request)
  - Friendship records are removed when users unfriend or block each other
  - Notifications sent to unfriended user
  - Console logs for debugging friendship changes

### Friend Management Features
- **Unfriend, Block, and Report**: Complete friend management system added
  - Three-dot menu button on each friend in Friends list
  - Unfriend: Remove friend with confirmation dialog
  - Block: Block user and remove from friends list (prevents future interactions)
  - Report: Report users for spam, harassment, inappropriate content, fake accounts, or other issues
  - Beautiful bottom sheet modals with smooth animations
  - Report submissions stored locally for future moderation features
  - Confirmation alerts for destructive actions

### Profile Photos Display
- **Profile Photos Visible Throughout App**: User profile photos now display in all social features
  - Activity feed shows profile photos for friends who posted memories
  - Friends list displays profile photos for all friends
  - Search results show profile photos for users being searched
  - Fallback to person icon placeholder when no profile photo is set
  - Photos display in circular avatars matching design system

### Privacy Enhancement - Profile Viewing Removed
- **User Profile Viewing Removed**: Profiles are now only visible to the profile owner
  - Removed ability to view other users' profiles (UserProfileScreen deleted)
  - Users can still add friends, like events, and see events on timeline
  - "View Profile" buttons replaced with "Friends" status indicators
  - Simplified friend management focused on memory sharing rather than profile browsing
  - Prevents potential crashes and simplifies privacy model

### Bug Fixes and UI Polish
- **Splash Screen Updated**: New pink ticket with checkmark splash screen (615KB)
  - Replaced previous splash screen with new branded design from assets folder
  - Larger, higher quality splash screen for better visual impact
- **App Icon Updated**: New app icon (1.4MB)
  - High quality icon with pink ticket branding
  - Consistent with splash screen design
- **Notification Auto-Read**: Notifications now automatically mark as read when opening bell icon
  - Users no longer need to manually mark notifications as read
  - Smoother UX with automatic read status on bell icon press
  - Notifications list screen also marks all as read on mount
- **Self-Friend Prevention**: Users can no longer add themselves as friends
  - Search results exclude the current user
  - Backend validation prevents self-friend requests
  - Cleaner friend search experience
- **Clickable Profile Pictures**: Profile pictures now navigate to user profiles
  - Clicking profile pictures in Activity feed opens user profiles
  - Friend list profile pictures are clickable
  - Search results profile pictures navigate to profiles (for friends only)
  - Respects privacy rules (only friends can view profiles)

### UI/UX Polish & Profile Navigation
- **Notification Button Improvements**: Fixed glitchy/delayed notification button responses
  - Refactored button handlers to use dedicated callback functions instead of inline functions
  - Added hitSlop to delete button for better touch target
  - Improved mark as read, delete, and friend request buttons responsiveness
  - All notification actions now respond instantly without delay
- **View Profile Navigation**: Added ability to view user profiles throughout the app
  - Clicking on a friend's name in the Activity feed now navigates to their profile
  - "View" button on Friends tab now properly opens the UserProfile screen
  - Search results show "View Profile" for existing friends with navigation
  - Only friends can view each other's profiles (privacy-respecting)
- **Enlarged Splash Screen Icon**: Increased splash screen icon size by 15% for better visibility
  - Icon size changed from 74x74px to 85x85px
  - Maintains centered positioning on white background
  - More prominent app branding on launch

### Profile and Privacy Features Enhancement
- **Enlarged Splash Screen Icon**: Increased splash screen icon size by 30% for better visibility
  - Icon size changed from 180x180px to 234x234px
  - Maintains centered positioning on white background
- **Editable Username**: Users can now edit their username in Edit Profile screen
  - Username uniqueness validation ensures no duplicate usernames
  - Format validation: letters, numbers, and underscores only
  - Changes update across all user references in the app
- **Public/Private Profile System**: Implemented profile privacy controls
  - Public profiles: Users can add as friends instantly without approval
  - Private profiles: Require friend request acceptance before adding
  - Default: All new accounts are public profiles
  - Privacy setting can be configured in Settings & Privacy screen
- **Friend Request Notifications**: Complete notification system for social interactions
  - Friend request received: Notifies when someone sends a friend request
  - Friend request accepted: Notifies when your request is accepted
  - New friend added: Notifies both users when becoming friends (public profiles)
  - Memory liked: Notifies when someone likes your memory/photo
  - All notifications appear in the bell icon in the app header
  - Notifications support both in-app alerts and push notifications
- **Friend Request Management**: Visible UI for managing friend requests
  - Friend requests appear at the top of the Friends screen for private accounts
  - Accept/Decline buttons clearly visible for pending requests
  - Horizontal scrollable list for multiple pending requests
  - Badge count on Friends tab shows number of pending requests
- **Profile Stats Visibility**: Friends can view each other's profile stats and events
  - View total tickets, spending, and top categories
  - See friend leaderboards and shared events
  - Users can ONLY edit/delete their OWN events (enforced in MemoryDetailScreen)
  - Friends can like memories but cannot modify them

### RevenueCat Plugin Configuration Fix (CRITICAL - LATEST)
- **Added Missing react-native-purchases Plugin**: Fixed IAP native module linking
  - Issue: Package was installed but plugin was missing from app.json
  - Added "react-native-purchases" to plugins array in app.json
  - This ensures native iOS RevenueCat SDK is properly linked during EAS builds
  - Without this plugin, IAP would fail in production builds (TestFlight/App Store)
  - **REQUIRES NEW BUILD**: You must create a new iOS build for IAP to work properly
  - RevenueCat API Key configured: appl_bhecBvkIgbcJVceikPBgvNiyXVd

### App Store Connect Configuration Fix
- **Fixed App Store Connect ID Mismatch**: Corrected ascAppId in eas.json
  - Issue: Builds were being submitted to wrong App Store Connect app (ID 6738858099)
  - Updated ascAppId to correct value: 6753213384 (matches actual app in App Store Connect)
  - Updated build number from 27 to 41 (next sequential build after 1.1.1 build 40)
  - This fixes why builds weren't appearing in App Store Connect
  - Ready for new production build and submission

### Splash Screen Update
- **Created Minimalist Splash Screen**: Small centered icon on pure white background
  - Generated new splash.png (1242x2688px) with 180x180px centered icon
  - Pure white background (#ffffff) matching iOS standards
  - Icon sized appropriately to match best practices (similar to major apps)
  - Updated app.json to use splash.png instead of full-size icon

### RevenueCat In-App Purchase Fix
- **Fixed "Setup In Progress" Alert**: Added missing `react-native-purchases` package
  - Issue: RevenueCat SDK was not installed in package.json, causing "Setup In Progress" alert in TestFlight
  - Added `react-native-purchases@9.6.1` to dependencies
  - Added `react-native-purchases` config plugin to app.json
  - IAP configuration already correct in code:
    - Product ID: `1022A`
    - Entitlement ID: `TickBox Premium Monthly`
    - Package ID: `$rc_monthly`
    - Offering ID: `default`
  - **NEXT STEP**: Create new iOS build with `eas build --platform ios` to include the package

### iOS Build Fix - Resource Bundle Signing
- **Fixed EAS Build Exit Code 65**: Resolved Xcode 14+ resource bundle signing issue
  - Issue: Starting from Xcode 14, resource bundles are signed by default, causing build failures
  - Created custom `ios/Podfile` with post_install hook to disable resource bundle signing
  - Added `CODE_SIGNING_ALLOWED = 'NO'` build setting to all resource bundle targets
  - Updated `eas.json` with proper build configuration:
    - Set image to "latest" for iOS builds
    - Added autoIncrement for build numbers
    - Configured resourceClass to "m-medium" for better build performance
  - Incremented iOS buildNumber to 24 in app.json
  - This fix resolves the "ARCHIVE FAILED Exit status: 65" error from fastlane

### iOS Native Project Generation
- **Fixed EAS Build Error**: Resolved "ReactCommon/RCTHost.h file not found" error
  - Issue: iOS native project folder was missing (prebuild hadn't been run)
  - Generated native iOS project using `expo prebuild --platform ios --clean`
  - Created ios/Podfile with proper React Native 0.79 configuration
  - Configured New Architecture (enabled by default in Expo SDK 53)
  - Updated app.json to remove deprecated `newArchEnabled` from build properties (now uses top-level config)
  - iOS build should now succeed on EAS Build

### iOS Build Fix & Code Quality
- **Fixed iOS Linker Error**: Resolved build failure from missing `expo-build-properties` configuration
  - Added `expo-build-properties` plugin to app.json with proper iOS/Android settings
  - Configured New Architecture support (newArchEnabled: true)
  - Set iOS deployment target to 15.1
  - This should fix the "linker command failed with exit code 1" error during EAS builds
- **Fixed React Hooks Violations**: Resolved all conditional hooks errors
  - Fixed `useNavigation` hook in AppNavigator.tsx by creating separate NotificationButton component
  - Moved all hooks before early returns in MemoryDetailScreen.tsx, ProfileScreen.tsx, and UserProfileScreen.tsx
  - All hooks now follow React rules and are called unconditionally in the same order
- **Updated ESLint Configuration**: Migrated to ESLint v9 flat config format
  - Created new eslint.config.js using FlatCompat for compatibility
  - Removed deprecated .eslintrc.js configuration

### Firebase Authentication & Account Deletion
- **Fixed Firebase Auth Persistence**: Resolved authentication not persisting after signup/login
  - Configured Firebase Auth to use AsyncStorage for React Native persistence
  - Auth sessions now properly persist between app restarts and screen navigation
  - Fixes "Missing or insufficient permissions" error during profile setup
  - The Firebase Auth warning about AsyncStorage is now resolved
- **Fixed User ID Mismatch**: Profile setup now handles ID mismatches between local storage and Firebase Auth
  - Automatically uses the correct Firebase Auth UID for all operations
  - Fixes permissions errors caused by ID mismatches from old accounts
  - Logs warnings when mismatches are detected and auto-corrects them
- **Fixed Sign Up Issue**: Resolved "Missing or insufficient permissions" error
  - The issue was caused by Firestore security rules blocking user creation
  - **ACTION REQUIRED**: Update Firestore security rules in Firebase Console (see instructions below)
  - Users can now successfully create accounts with email/password
- **Profile Setup Improvements**:
  - Added "Sign Out" button to profile setup screen for easy account switching
  - Removed iOS autofill yellow highlight from input fields
  - Disabled keyboard suggestions and autocorrect on all profile fields
  - Fields are now fully editable without iOS interference
- **Comprehensive Account Deletion**: Enhanced user data cleanup when account is deleted
  - Deletes all user memories from Firestore
  - Deletes all associated images from Firebase Storage (memory photos, cover photos, uploaded tickets)
  - Deletes user profile picture from Storage
  - Deletes user document from Firestore
  - Finally deletes Firebase Authentication account
  - All traces of user data are removed when account is deleted
  - Includes error handling to continue deletion even if some resources fail

**IMPORTANT: Firestore Security Rules Setup**

To fix the sign-up issue, update your Firestore security rules in the Firebase Console:

1. Go to Firebase Console → Firestore Database → Rules tab
2. Replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      // Allow user to read their own data
      allow read: if request.auth != null && request.auth.uid == userId;
      // Allow user to create their own document during signup
      allow create: if request.auth != null && request.auth.uid == userId;
      // Allow user to update their own data
      allow update: if request.auth != null && request.auth.uid == userId;
      // Allow user to delete their own data
      allow delete: if request.auth != null && request.auth.uid == userId;
      // Allow users to search other users (for friend requests)
      allow read: if request.auth != null;
    }

    // Memories collection (named 'Tickets' in Firebase)
    match /Tickets/{memoryId} {
      // Allow authenticated users to create memories
      allow create: if request.auth != null;
      // Allow owner to read, update, delete their memories
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
      // Allow friends to read public memories
      allow read: if request.auth != null && resource.data.showOnFeed == true;
    }
  }
}
```

3. Click "Publish" to save the rules

### Firebase Data Persistence & Validation
- **Fixed Profile Setup**: Bio and location fields now properly save to Firebase
  - ProfileSetupScreen now calls `updateUserDocument()` to save all fields to Firestore
  - `profileSetupComplete` flag now correctly sets to `true` after setup
- **Fixed Login Data Sync**: User data now properly syncs between Firebase and local storage
  - SignInScreen loads data from Firebase and syncs with local `registeredUsers` array
  - Ensures data persists correctly after logout/login cycles
- **Duplicate Prevention**: Added checks to prevent duplicate accounts
  - Checks Firebase for existing email before creating account
  - Checks Firebase for existing username before creating account
  - Prevents creating multiple accounts with same credentials
- **Data Flow**:
  - Sign Up → Creates user in Firebase → Saves to local storage
  - Profile Setup → Updates Firebase → Updates local storage
  - Sign In → Loads from Firebase → Syncs to local storage

### Firebase Backend Setup
- **Firebase Project Created**: tickbox-app-ae2de
- **Firebase SDK Installed**: firebase v12.4.0
- **Configuration File**: `config/firebase.ts` - Initializes Firebase with environment variables
- **App Integration**: Firebase initialized in `App.tsx` on app launch
- **Environment Variables Added** (.env):
  - `EXPO_PUBLIC_FIREBASE_API_KEY`
  - `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
  - `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `EXPO_PUBLIC_FIREBASE_APP_ID`

**Available Firebase Services:**
- `auth` - Firebase Authentication (imported from `config/firebase`)
- `db` - Cloud Firestore database (imported from `config/firebase`)
- `storage` - Firebase Storage (imported from `config/firebase`)

**Next Steps to Complete Firebase Integration:**
1. Enable Authentication providers in Firebase Console (Email/Password)
2. Create Firestore database in production mode
3. Create Storage bucket for image uploads
4. Update authentication screens to use Firebase Auth
5. **⚠️ CRITICAL: Set up Firestore collections for friendships** (see Firestore Requirements below)

## Firestore Requirements

### Required Collections

The app now requires the following Firestore collections to be set up:

#### 1. `friendships` Collection
Stores bidirectional friendship relationships between users.

**Fields:**
- `user1Id` (string) - ID of first user in friendship
- `user2Id` (string) - ID of second user in friendship
- `createdAt` (string) - ISO timestamp of when friendship was created
- `createdAtTimestamp` (timestamp) - Firestore server timestamp

**Indexes Required:**
```
Collection: friendships
- user1Id (Ascending) + user2Id (Ascending)
- user2Id (Ascending) + user1Id (Ascending)
```

**Security Rules:**
```javascript
// Allow users to read their own friendships
match /friendships/{friendshipId} {
  allow read: if request.auth != null &&
    (resource.data.user1Id == request.auth.uid ||
     resource.data.user2Id == request.auth.uid);
  allow create: if request.auth != null &&
    (request.resource.data.user1Id == request.auth.uid ||
     request.resource.data.user2Id == request.auth.uid);
  allow delete: if request.auth != null &&
    (resource.data.user1Id == request.auth.uid ||
     resource.data.user2Id == request.auth.uid);
}
```

#### 2. `friendRequests` Collection
Stores pending, accepted, and declined friend requests.

**Fields:**
- `fromUserId` (string) - ID of user who sent request
- `toUserId` (string) - ID of user receiving request
- `status` (string) - "pending", "accepted", or "declined"
- `createdAt` (string) - ISO timestamp when request was created
- `updatedAt` (string) - ISO timestamp when request was last updated
- `createdAtTimestamp` (timestamp) - Firestore server timestamp
- `updatedAtTimestamp` (timestamp) - Firestore server timestamp

**Indexes Required:**
```
Collection: friendRequests
- fromUserId (Ascending) + status (Ascending)
- toUserId (Ascending) + status (Ascending)
```

**Security Rules:**
```javascript
// Allow users to read requests they sent or received
match /friendRequests/{requestId} {
  allow read: if request.auth != null &&
    (resource.data.fromUserId == request.auth.uid ||
     resource.data.toUserId == request.auth.uid);
  allow create: if request.auth != null &&
    request.resource.data.fromUserId == request.auth.uid;
  allow update: if request.auth != null &&
    resource.data.toUserId == request.auth.uid;
  allow delete: if request.auth != null &&
    (resource.data.fromUserId == request.auth.uid ||
     resource.data.toUserId == request.auth.uid);
}
```

### Setup Instructions

1. **Create Collections**: In Firebase Console, go to Firestore Database and create the two collections (`friendships` and `friendRequests`). They will be created automatically when the first document is added.

2. **Add Indexes**: Go to Firestore → Indexes and add the composite indexes listed above. These are required for efficient querying.

3. **Update Security Rules**: In Firestore → Rules, add the security rules above to ensure users can only access their own friendship data.

4. **Test**: After setup, test by:
   - Adding a friend (creates a friendship document)
   - Sending a friend request to a private profile (creates friendRequest document)
   - Unfriending someone (deletes friendship document)
   - Viewing the data in Firebase Console to confirm it's being created

### Migration Notes

- Existing local friendships (stored in AsyncStorage) will NOT automatically migrate to Firestore
- Users will need to re-add their friends after the Firestore setup is complete
- Consider adding a migration script if you have existing users with friendships

**Next Steps to Complete Firebase Integration:**
- If `src/config/firebase.ts` or `src/services/firebase.ts` exist, they may be outdated
- Current setup uses `config/firebase.ts` as the primary Firebase configuration

### Authentication & Data Persistence Fix
- Fixed critical authentication issue where user data wasn't persisting after sign out/sign in
  - Modified SignInScreen and SignUpScreen to properly load full user data from registeredUsers
  - Now correctly maintains `introSeen` and `profileSetupComplete` flags on re-login
  - Intro carousel now only shows on FIRST TIME login (when user creates account)
  - All user data (tickets, memories, friends, settings) now properly persists across sessions
  - Data stored in AsyncStorage via Zustand persist middleware

### Friends System (Verified Working)
- Search users by username or display name: ✓ Working
- Add friends via friend requests: ✓ Working
- View friend profiles (UserProfileScreen): ✓ Working
- Users can ONLY edit/delete their OWN events: ✓ Verified in MemoryDetailScreen (lines 118-133)
- Tag friends in memories: ✓ Working (notifications sent to tagged friends)
- Friends leaderboard showing tagged event counts: ✓ Working in ProfileScreen
- Activity feed showing friend memories: ✓ Working in FriendsScreen

### TestFlight Fix
- Fixed TestFlight blank screen issue by removing SafeAreaView from DashboardScreen
  - React Navigation tab navigator already handles safe areas with `headerShown: true`
  - Using SafeAreaView caused conflicts in production builds (TestFlight)
  - App now uses regular View wrapper which works correctly on both development and production
