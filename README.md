# Mainframe Search README

Search a mainframe library running a _jcl_ with __ISRSUPC__.

## Table of Contents

1. [Features](##Features)
2. [Requirements](##Requirements)
3. [Settings](##Settings)
4. [How to...](##How-to...)
5. [Known Issues](##Known-Issues)
6. [Release Notes](##Release-Notes)


## 1. Features

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

## 2. Requirements

- [Zowe Explorer](https://marketplace.visualstudio.com/items?itemName=Zowe.vscode-extension-for-zowe) VSCode Extension.
- A zosmf connection profile.
- A valied User ID.

## 3. Settings

This extension contributes the following settings:

* `zSearch.JobName`: Job Name to be used on Job Card.

  >__Default value:__ _${USER}S_
  >
  >💡 __Info:__ In the job card the variable _${USER}_ will be replaced by the _userid_ associated with the active _zosmf_ profile.

* `zSearch.JobCardCLASS`: Class to be used on Job Card.

  >__Default value:__ D

* `zSearch.JobCardMSGCLASS`: Message Class to be used on Job Card.

  >__Default value:__ X


## 4. How to...

1. On the zowe explorer select a library
2. Expand the library
3. Right click on the library
4. Select the __zSearch - Search on library__ menu item
5. Enter the string to search
6. Enter the Filters to user
7. On the mainframe a JCL job will be launched
8. A panel will show the results returned by the job after it's execution as ended. The result can be visualized as a list, outDD or json:
   1. List - List of elements with the search string:
      1. The list of elements can be expanded tho show the line number em content of the line hiliting the search string.
      2. The line number as a link that will open the element on its respective line.
   2. OutDD - Representation of the sysout element outDD with the search result.
   3. Json - The search results represented as a json object.
9.  The line number on the list opens the selected element at its line.

>
> ### 💡 __Filter Facts:__
>
> 1. Filter can select elements that start or end with a string:
>    1. Start with a alfa-numeric string (example: __'aaa*'__ or __'aaa'__)
>    1. Ends with a alfa-numeric string (example: __'*aaa'__)
>    1. No filter (example: __''__ or __'*'__)
> 2. More than one filter can be user if separated by a coma (example: __'aaa*, *aaa'__)
---
## 5. Known Issues

- If the search string is in lowercase it will not be highted.
---
## 6. Release Notes

### 1.0.3

Correction of the zowe session access.

### 1.0.2

Correcting the job definition

### 1.0.1

Initial release of zSearch

[Return to the beginning](##-Index)
