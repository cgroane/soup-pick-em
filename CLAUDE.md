## Soup Pick em

### Project overview
- Web application with firestore / firebase, a variety of external APIs and react with TS. 
- Each week during the college football season, the user with slate-picker role chooses 10 games from the weeks college football games, and adds them to a slate. A slate is not complete without 10 games. 
- Other users then pick which team in each of those games they think will cover the point spread. A cron job runs every tuesday to verify users selections. Users selections and records are stored in the firestore db.
- NEW: Groups
  - users must be invited to private groups via invite code or join a public group
  - TBD: what happens if user is not in a group? they are unable to participate? or they join a master group with all other users?
  - slates are scoped to a group: users not in that group are not able to pick against that slate. if a user is in that group and another, they must switch group contexts in order to pick against that group's slate.
  - CFP brackets are also scoped to group, though those are not set by any particular person, the teams involved are not optional
  - a group can have 1 owner and 1 slate-picker at any given time
  - a group can have any number of members
  - a group can be public or private

## Data structures
firestore document data examples in Firestore-export.overall_export_metadata and json files in data-examples folder.


## feature review

### Auth
- email and pw or google auth both supported. Upon sign in, a user record is created in the firestore db, as well as a user document in the users collection.
- auth is required to use the api or interface with anything in the application.
- RBAC - there are layers to the role system.
  - master: admin role (me, and whoever else i choose)
  - group
    - admin or owner: only one per group
    - slate-picker: only one at a time per group
    - member: any number per group

### Admin Priveleges
admin can:
  - change a group's owner
  - since i have db access, an interface isn't necessary for all features
  - admin is the only role that is not group scoped
  - Anything a `member` can do

### Group Owner Privileges
group owner can:
  - Change the given group's slate-picker
  - invite new members to the group
  - manage group
  - Anything a `member` can do

### Slate picker privileges
slate-picker can:
  - choose the games for the given slate for the given group
  - edit the slate (within timing restriction bounds)
  - Anything a `member` can do

### Member
members can:
  - pick against the selected slate
  - view results
  - view their profile
  - edit their picks (within timing restriction bounds)
  - view matchups page without slate picking ability
  - interact with week picker
  - pick against cfp bracket with same timing restrictions as slates
  - toggle group
  - view their groups
  - create a new group


##

### choose matchups page
- this page pulls in data from the cfbd api games, rankings, odds, and team info and sportsdataio current-week. Each of those responses need to me mapped into the correct object.
- Each game is rendered with each team and the team's information on it
  - if the current user is slate-picker (scoped to current group), they are able to see, in addition to base card, interactive elements for adding the given game to the slate.
- considerations: 
  - if the slate-picker sets the slate, then users of the group submit their picks for the slate and the slate-picker then changes one or more games in the slate, the users who had already submitted picks will need to resubmit their picks with the new games that have been added. this requires deleting existing entries for games that were overwritten for that slate
- page should load with selections prepopulated if a slate for this group, this week exists already.
- slate can be changed up until the first game of the week has started.

### Making picks
- User can choose either team to cover the spread, or they can choose push. Push is selected by default
- if user has submitted picks, this page should load with selections prepopulated
- user can change picks up until the earliest listed game start date, after which all picks will be locked and uneditable

### Profile
- All users have a profile page
- it should show their contextualized overall records by season in one card
- it should show the leaderboard for the group they are currently scoped to with a view more link to the weekly picks page (see picks/index.tsx)
- it should have a link to the matchups (or choose slate page)
- it should have a link to make picks page
- the make picks page link should indicate if their picks are incomplete for the current group (they must have a selection for each game in the slate for it to be complete)
- if the user is the slate-picker for the current group, the Pick slate link should also indicate action required.

### Group Switching
- Dropdown containing each group user is a member of
- Clicking one of the groups changes the context for the user so they begin viewing data for that group instead of the previous one.
- FUTURE FEATURE: if a group in the menu has action required (pick slate, make picks), an indicator should appear next to the group name

### Score checking
- CRON Job run by google cloud functions compares final scores to spreads to user selections and marks each game as correct or in correct
- each correct selection should be marked and stored in their win / loss record by year
- FUTURE FEATURE: win loss record by group and by year
- src/pages/Picks.tsx should show each user in the groups selection in a table (first column user name, each column after representing each game in the slate with the user's selection below). each cell should show if the pick was correct if the slate has been processed, else indicate neutrality.

### Switching weeks
- Selecting either a week or a year in the dropdown triggers a fetch of data for that combination.
- selecting Post Season (if available) evaluates to week 1, {year} and indicates to fetch POSTSEASON data from the api.

### Post season
- Post season slate can be selected, the slate will indicate if it is a post season slate. all other slate selection rules still apply except, instead of per week, there is only 1 Post season slate
- CFP Bracket:
  - Still scoped to groups, selection of games is not editable
  - users still pick against the spread for these games
  - They make their picks on a rolling basis as the CFP advances rounds