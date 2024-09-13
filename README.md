# Mainframe Search README

Search a mainframe library running ISRSUPC in a job.

## Features

- [x] Search the mainframe for a string
- [x] Select the library from the Zowe Explorer
- [ ] Filter the search library elements to reduce search job execution time
- [x] Visualize search results
  - [x] List of elements
  - [x] Json format
  - [x] OutDD format
- [x] Showed information
  - [x] Show line number
  - [x] Show the line where the search string
- [ ] Open a element from the search results
- [x] Remove the dependency from Zowe CLI
- [x] highlight the search string
  - [x] List
  - [x] OutDD
  - [x] Json
- [ ] Link to open element

## Requirements

- Zowe Explorer

## Extension Settings

This extension contributes the following settings:

* `zSearch.JobName`: Job Name to be used on Job Card.
* `zSearch.JobCardCLASS`: Class to be used on Job Card.
* `zSearch.JobCardMSGCLASS`: Message Class to be used on Job Card.


>💡 Note: The Job name has the default __${USER}S__.

## Known Issues

- n/a

## Release Notes

### 1.0.0

Initial release of zSearch
