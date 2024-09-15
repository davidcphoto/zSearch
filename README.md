# Mainframe Search README

Search a mainframe library running ISRSUPC in a job.

## Features

1. Search the mainframe for a string
1. Select the library from the Zowe Explorer
1. Filter the search library elements
1. Visualize search results
   1. List of elements
   1. Json
   1. OutDD
1. Showed information
   1. Show line number
   1. Show the line where the search string
1. Opens an item from the search results list in the row where that result is located.
1. highlight the search string
   1. List
   1. OutDD
   1. Json

## Requirements

- Zowe Explorer VS Code Extension.
- A zosmf connection profile.
- A valied User ID.

## Extension Settings

This extension contributes the following settings:

* `zSearch.JobName`: Job Name to be used on Job Card.

  >__Default value:__ _${USER}S_
  >
  > 💡 __Note:__ In the job card the variable _${USER}_ will be replaced by the _userid_ associated with the active _zosmf_ profile.

* `zSearch.JobCardCLASS`: Class to be used on Job Card.

  >__Default value:__ D

* `zSearch.JobCardMSGCLASS`: Message Class to be used on Job Card.

  >__Default value:__ X

## Known Issues

- If the search string is in lowercase it will not be highted.

## Release Notes

### 1.0.0

Initial release of zSearch
