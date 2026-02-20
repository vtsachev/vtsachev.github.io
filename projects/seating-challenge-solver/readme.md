# Seating Challenge Solver

## Overview

This web application provides an interactive interface to solve the "Math - Seating Challenge". Users can assign colors (Red, Green, Blue, Purple) to 8 individuals arranged in a specific seating layout and then validate their arrangement against a set of predefined rules.

This puzzle now uses a 4×4 grid. You must place exactly 8 circles in the grid during the placement phase, then assign colors to each circle in the coloring phase. The final arrangement must satisfy all rules listed below.

## How to Use

1.  **Open the Application:** Open the `index.html` file in a modern web browser.
2.  **Phase 1 (Placement):** Click on empty squares to place exactly 8 circles, then click "Confirm Layout."
3.  **Phase 2 (Coloring):** Click on any placed circle to cycle its color. Use "Check Validity" when you are ready.
4.  **Reset Layout** clears all circles so you can start over.
5.  **Homework 1 button** lets you load or reveal a preset layout and solution.
6.  **Check Validity:** Once you have assigned colors to the seats, click the **"Check Validity"** button.
7.  **View Results:** The application will evaluate the current color arrangement against all the rules. The status for each rule will be displayed below the button:
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
