# Seating Challenge Solver

## Overview

This web application provides an interactive interface to solve the "Math - Seating Challenge". Users can assign colors (Red, Green, Blue, Purple) to 8 individuals arranged in a specific seating layout and then validate their arrangement against a set of predefined rules.

The layout consists of 8 seats arranged as follows:
* A central column of three seats (Top, Center, Bottom).
* One seat to the left of the Center seat.
* A row of four seats extending horizontally to the right, starting from the seat immediately to the right of the Center seat.
  [ ]       (Top - ID 0)
[ ] - [ ] - [ ] - [ ] - [ ] - [ ]   (Left-ID 3, Center-ID 1, Right1-ID 4, R2-ID 5, R3-ID 6, R4-ID 7)
[ ]       (Bottom - ID 2)

*(Note: IDs shown correspond to internal element IDs used in the code)*

## How to Use

1.  **Open the Application:** Open the `index.html` file in a modern web browser.
2.  **Assign Colors:** Click on any of the 8 circles representing the seats. Each click cycles the circle's color through the following sequence:
    * Uncolored (White) -> Red -> Green -> Blue -> Purple -> Uncolored (White) ...
3.  **Check Validity:** Once you have assigned colors to the seats, click the **"Check Validity"** button.
4.  **View Results:** The application will evaluate the current color arrangement against all the rules. The status for each rule will be displayed below the button:
    * `✔️ Honored`: The current arrangement satisfies this rule.
    * `❌ Violated`: The current arrangement does not satisfy this rule.
    * `(Pending)`: The status before validation or after a change.

## Rules

The seating arrangement must adhere to the following rules:

1.  **Color Distribution:** At least one person wears each color (Red, Green, Purple), and *exactly* one person wears Blue cloth.
2.  **Red/Green Separation:** People wearing Red and people wearing Green cannot sit together (adjacently, horizontally or vertically).
3.  **Blue/Purple Separation:** People wearing Blue and people wearing Purple cannot sit together (adjacently, horizontally or vertically).
4.  **Red Placement:** If a person is wearing Red, they MUST sit between people wearing Purple (i.e., every Red circle must have at least two adjacent Purple circles).
5.  **Purple Placement:** At least one person who wears Purple MUST sit between people wearing Green (i.e., there must be at least one Purple circle with at least two adjacent Green circles).
6.  **Purple Adjacency:** At least two people wearing Purple need to sit together (i.e., there must be at least one pair of adjacent Purple circles).

*(Adjacency refers to circles directly connected horizontally or vertically, not diagonally).*

## Project Files

* `index.html`: The main structure of the web page.
* `style.css`: Contains the styling rules for layout, colors, and appearance.
* `script.js`: Implements the color cycling interaction and the validation logic.
* `readme.md`: This file.

## Technology

This project is built using standard web technologies:
* HTML
* CSS (including CSS Grid for layout)
* JavaScript (Vanilla JS for interaction and logic)