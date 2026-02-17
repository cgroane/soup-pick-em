## Soup Pick em

### Project overview
Web application with firestore / firebase, a variety of external APIs and react with TS using grommet. 
There are 3 roles for a given user - admin (only me), base, slate-picker (only one at a time). Each week during the college football season, the user with slate-picker role chooses 10 games from the weeks college football games, and adds them to a slate. A slate is not complete without 10 games. 
All other users then pick which team in each of those games they think will cover the point spread. A cron job runs every tuesday to verify users selections. Users selections and records are stored in the firestore db.

## Data structures
firestore document data examples in Firestore-export.overall_export_metadata and json files in data-examples folder.


## feature review

### Auth
email and pw or google auth both supported. Upon sign in, a user record is created in the firestore db, as well as a user document in the users collection.

### choose matchups page
this page pulls in data from the cfbd api games and rankings, theodds api, and sportsdataio teams endpoint each containing needed data. Each of those responses need to me mapped into the correct object.
This is currently an imperfect match, sometimes resulting in incorrect data placement. The odds api does not return identification for teams in any way so we have to match strings.
