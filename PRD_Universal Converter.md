# Product Requirements Document: Universal Converter for macOS

**Product Name:** Universal Converter

**Version:** 1.0

**Author:** Spencer Francisco

## 1. Introduction

### 1.1 Purpose

This Product Requirements Document (PRD) outlines the requirements for the Universal Converter, a macOS utility designed to provide quick and easy conversions between various units, currencies, and time zones. This document is intended for an AI agentic coding agent, specifically optimized for consumption and build within the Kiro IDE environment, to facilitate the automated development of the application.

### 1.2 Scope

The Universal Converter will be a lightweight, always-available macOS application accessible from the menu bar or via a quick keyboard shortcut. It will support three primary conversion categories: Units (length, weight, temperature, etc.), Currencies (with live exchange rates), and Time Zones. The application will prioritize user experience, accuracy, and efficiency.

### 1.3 Target Audience

The primary target audience for the Universal Converter includes:

*   **Travelers:** Who frequently need to convert currencies and time zones.
*   **International Business Professionals:** Requiring quick currency and time zone conversions for global communication and transactions.
*   **Students:** Needing to convert various units for academic purposes.
*   **General Users:** Anyone who frequently needs to convert units or values in their daily life or work.

### 1.4 Goals

*   To provide a single, comprehensive, and always-available conversion utility for macOS.
*   To offer accurate and up-to-date conversion rates for currencies and time zones.
*   To ensure a fast, intuitive, and user-friendly experience.
*   To be developed as an open-source project, fostering community contributions.
*   To demonstrate the effectiveness of AI agentic coding tools (Kiro IDE, Warp.dev, Claude Code, Cursor) in building practical applications.

## 2. Functional Requirements

### 2.1 Unit Conversion

**2.1.1 Supported Unit Categories:** The application shall support a comprehensive range of unit categories, including but not limited to:
*   Length (e.g., meters, feet, miles, kilometers, inches)
*   Weight/Mass (e.g., kilograms, pounds, ounces, grams, tons)
*   Temperature (e.g., Celsius, Fahrenheit, Kelvin)
*   Volume (e.g., liters, gallons, cubic meters, fluid ounces)
*   Area (e.g., square meters, acres, square feet)
*   Speed (e.g., meters per second, kilometers per hour, miles per hour)
*   Time (e.g., seconds, minutes, hours, days, weeks, years)
*   Digital Storage (e.g., bits, bytes, kilobytes, megabytes, gigabytes, terabytes)
*   Energy (e.g., joules, calories, kilowatt-hours)
*   Pressure (e.g., pascals, PSI, atmospheres)
*   Angle (e.g., degrees, radians, gradians)

**2.1.2 Conversion Input:** Users shall be able to input a numerical value and select the 'from' unit and 'to' unit from a clearly organized list. The application shall provide real-time conversion results as the user types or selects units.

**2.1.3 Unit Selection:** The unit selection interface shall be intuitive, potentially using a search bar for quick filtering of units within a category. Units should be grouped logically by category.

**2.1.4 Accuracy:** Unit conversions shall be performed with high precision, supporting a reasonable number of decimal places (e.g., up to 10 decimal places) to ensure accuracy for scientific and engineering applications.

**2.1.5 Error Handling:** The application shall gracefully handle invalid inputs (e.g., non-numeric characters) and provide clear feedback to the user.

### 2.2 Currency Conversion

**2.2.1 Live Exchange Rates:** The application shall fetch and display live exchange rates for a comprehensive list of global currencies. The exchange rates should be updated regularly (e.g., hourly or daily) to ensure accuracy.

**2.2.2 Supported Currencies:** The application shall support a wide range of international currencies, including major world currencies and commonly traded ones.

**2.2.3 Conversion Input:** Users shall be able to input a numerical value and select the 'from' currency and 'to' currency. Real-time conversion results shall be displayed as the user types or selects currencies.

**2.2.4 Exchange Rate Source:** The application shall utilize a reliable and publicly accessible API for fetching exchange rates.

**2.2.5 Offline Mode:** The application shall store the last fetched exchange rates locally to provide basic conversion functionality even when offline. A clear indication of data freshness shall be provided.

**2.2.6 Historical Data (Optional):** As a future enhancement, the application could offer the ability to view historical exchange rate trends.

### 2.3 Time Zone Conversion

**2.3.1 Time Zone Selection:** Users shall be able to select a 'from' time zone and a 'to' time zone from a comprehensive list of global time zones. The list should be searchable and logically organized (e.g., by continent or major city).

**2.3.2 Current Time Display:** The application shall display the current time in both the 'from' and 'to' time zones, considering Daylight Saving Time (DST) rules.

**2.3.3 Future/Past Time Conversion:** Users shall be able to input a specific date and time in the 'from' time zone and see the corresponding date and time in the 'to' time zone.

**2.3.4 Time Zone Data Source:** The application shall utilize a reliable and up-to-date source for time zone data, including DST rules.

**2.3.5 Time Zone Search:** A search functionality for time zones shall be provided to quickly locate specific time zones.

### 2.4 User Interface and Accessibility

**2.4.1 Menu Bar Integration:** The application shall reside in the macOS menu bar, providing quick access to conversion functionalities without cluttering the dock.

**2.4.2 Quick Shortcut Access:** Users shall be able to invoke the application via a customizable global keyboard shortcut.

**2.4.3 Intuitive Input Fields:** Input fields for values and units/currencies/time zones shall be clear, responsive, and support auto-completion or suggestions where applicable.

**2.4.4 Real-time Results:** Conversion results shall update in real-time as the user types or makes selections.

**2.4.5 Copy to Clipboard:** A clear and easily accessible button or action shall be provided to copy the converted result to the clipboard.

**2.4.6 Dark Mode Support:** The application shall fully support macOS Dark Mode, adapting its appearance seamlessly.

**2.4.7 Accessibility Features:** The application shall adhere to macOS accessibility guidelines, including support for VoiceOver, keyboard navigation, and adjustable text sizes.

**2.4.8 Minimalist Design:** The UI shall be clean, uncluttered, and focus on the core conversion functionality, avoiding unnecessary visual distractions.

### 2.5 Data Management and Updates

**2.5.1 Automatic Updates:** The application shall automatically check for and download updates for unit definitions, currency exchange rates, and time zone data to ensure accuracy and relevance.

**2.5.2 Manual Update Trigger:** Users shall have the option to manually trigger data updates.

**2.5.3 Data Freshness Indicator:** A visual indicator shall inform the user about the last time data was updated, especially for currency exchange rates.

**2.5.4 Offline Data Storage:** All necessary conversion data (unit definitions, last-known currency rates, time zone rules) shall be stored locally to enable offline functionality.

**2.5.5 Efficient Data Handling:** The application shall handle data efficiently to minimize storage footprint and ensure fast retrieval of conversion information.

## 3. Non-Functional Requirements

### 3.1 Performance

**3.1.1 Responsiveness:** The application shall launch quickly (within 1-2 seconds on modern Macs) and provide real-time conversion results with minimal latency (under 100ms).

**3.1.2 Resource Usage:** The application shall have a small memory footprint (e.g., less than 100MB idle RAM usage) and minimal CPU consumption, ensuring it does not significantly impact overall system performance.

**3.1.3 Efficiency:** Data fetching and processing for conversions shall be optimized to ensure quick updates and smooth user interaction.

### 3.2 Reliability

**3.2.1 Stability:** The application shall be stable and free from crashes or freezes during normal operation.

**3.2.2 Error Recovery:** In case of external API failures (e.g., currency exchange rates), the application shall gracefully fall back to cached data and inform the user.

**3.2.3 Data Integrity:** All locally stored data (e.g., unit definitions, cached exchange rates) shall be maintained with high integrity and consistency.

### 3.3 Security

**3.3.1 Data Privacy:** The application shall not collect any personal user data. All conversion operations and data storage shall be local to the user's machine, except for fetching live exchange rates and time zone data from trusted external APIs.

**3.3.2 API Key Management:** If external APIs require keys, these shall be handled securely and not exposed in client-side code.

**3.3.3 Secure Updates:** Application updates shall be delivered securely, ensuring authenticity and integrity to prevent malicious code injection.

### 3.4 Maintainability

**3.4.1 Code Quality:** The codebase shall be clean, well-documented, and follow established coding standards to facilitate future maintenance and contributions.

**3.4.2 Modularity:** The application architecture shall be modular, allowing for easy addition of new unit categories, currency sources, or time zone features without extensive refactoring.

**3.4.3 Testability:** The codebase shall be designed for testability, with comprehensive unit and integration tests to ensure correctness and prevent regressions.

### 3.5 Scalability

**3.5.1 Data Handling:** The application shall be able to handle an increasing number of unit types, currencies, and time zones without significant performance degradation.

**3.5.2 Future Feature Integration:** The architecture shall support the seamless integration of future features, such as historical data for currencies or additional conversion categories.

## 4. Technical Specifications

### 4.1 Architecture

The Universal Converter will adopt a client-side, modular architecture, primarily built using the Electron framework. This choice allows for cross-platform compatibility (though initially focused on macOS) and leverages web technologies (HTML, CSS, JavaScript) for UI development, which aligns well with the capabilities of AI agentic coding tools. The application will consist of the following logical components:

*   **User Interface (UI) Layer:** Built with HTML, CSS, and JavaScript (e.g., React or Vue.js) to provide an interactive and responsive user experience.
*   **Main Process (Electron):** Manages the application lifecycle, native macOS integrations (menu bar, global shortcuts), and communication with renderer processes.
*   **Renderer Processes (Electron):** Handle the UI rendering and user interactions for each conversion type (Units, Currencies, Time Zones).
*   **Conversion Logic Module:** Contains the core algorithms and data structures for performing unit, currency, and time zone conversions.
*   **Data Management Module:** Responsible for fetching, storing, and updating conversion data (unit definitions, exchange rates, time zone rules).
*   **API Integration Layer:** Handles communication with external APIs for live currency exchange rates and time zone data.

### 4.2 Technology Stack

*   **Framework:** Electron (for desktop application development)
*   **Frontend:** React.js or Vue.js (for building the user interface components)
*   **Backend (Local):** Node.js (for Electron's main process and local data processing)
*   **Database (Local):** SQLite or similar lightweight embedded database (for storing unit definitions, cached currency rates, and time zone data)
*   **Unit Conversion Library:** A well-established open-source JavaScript library for unit conversions (e.g., `math.js` or `convert-units`).
*   **Currency Exchange Rate API:**
    *   **ExchangeRate-API:** (Free tier available) Offers a free tier with 1,500 requests/month, supporting 161 currencies, and provides daily updates. It has a simple REST API and is well-documented.
    *   **Open Exchange Rates:** (Free tier available) Provides live and historical exchange rates for over 200 world currencies, with a free plan offering 1,000 requests/month. It's trusted by many businesses.
    *   **Frankfurter:** (Free and Open Source) A free, open-source API for exchange rates, offering current and historical data. It's a good option for open-source projects due to its nature.
    *   *Recommendation:* Start with Frankfurter due to its open-source nature and ease of use. If more frequent updates or a wider range of currencies are needed, ExchangeRate-API or Open Exchange Rates can be considered.
*   **Time Zone Data/API:**
    *   **World Time API:** (Free) A simple JSON/plain-text API to obtain the current local time for a given timezone. It's free and easy to use.
    *   **TimeZoneDB:** (Free) Provides a free time zone database and API for cities of the world, licensed under Creative Commons. It includes DST information.
    *   **IANA Time Zone Database (tz database):** (Free and Open Source) This is the primary source for time zone and DST information. While not an API, libraries exist (e.g., `zoneinfo` in Python, or JavaScript libraries built on top of it) that can leverage this data locally.
    *   *Recommendation:* Utilize a JavaScript library that incorporates the IANA Time Zone Database for robust offline support and accurate DST handling. World Time API or TimeZoneDB can be used for initial lookups or to verify data freshness.

### 4.3 AI Agentic Coding Considerations (for Kiro IDE)

Kiro IDE, combined with AI agentic coding tools like Warp.dev, Claude Code, and Cursor, will be instrumental in the rapid development and maintenance of the Universal Converter. The PRD is structured to facilitate this process by providing clear, granular requirements that can be translated into actionable coding tasks for AI agents.

**4.3.1 Code Generation and Scaffolding:**
*   **Initial Setup:** AI agents can be prompted to scaffold the basic Electron application structure, including `package.json`, `main.js`, `index.html`, and basic renderer process files for each conversion type.
*   **Component Generation:** For the UI layer (React/Vue.js), agents can generate reusable components for input fields, unit/currency/time zone selectors, and display areas based on specified design patterns and accessibility guidelines.
*   **Boilerplate Code:** Agents can generate boilerplate code for API integrations, local data storage (SQLite setup, schema definition), and inter-process communication within Electron.

**4.3.2 Functional Implementation:**
*   **Conversion Logic:** AI agents can be given detailed specifications for unit conversion formulas, currency exchange rate calculations, and time zone adjustments (including DST). They can generate the corresponding JavaScript functions and ensure mathematical accuracy.
*   **API Integration:** Agents can write code to make HTTP requests to the chosen currency and time zone APIs, parse the JSON responses, and handle error conditions.
*   **Data Persistence:** Agents can generate code for reading from and writing to the local database for caching data and managing user preferences.

**4.3.3 Testing and Debugging:**
*   **Unit Test Generation:** AI agents can automatically generate unit tests for critical conversion functions, API integration logic, and data management modules, ensuring code correctness and preventing regressions.
*   **Debugging Assistance:** Kiro IDE, with its integrated AI capabilities, can assist developers in identifying and suggesting fixes for bugs, analyzing error logs, and optimizing code performance.
*   **Performance Profiling:** Agents can help in setting up and interpreting performance profiles to identify bottlenecks in the application, especially concerning real-time updates and resource usage.

**4.3.4 UI/UX Design and Refinement:**
*   **Component Styling:** AI agents can assist in generating CSS (or styled-components/Tailwind CSS) for UI elements, ensuring adherence to macOS design principles and Dark Mode compatibility.
*   **Layout Generation:** Agents can propose and generate responsive layouts for the application window and menu bar popover, optimizing for usability and visual appeal.
*   **Accessibility Implementation:** Agents can ensure that generated UI components meet accessibility standards (e.g., ARIA attributes, keyboard navigation).

**4.3.5 Open Source Contribution Facilitation:**
*   **Documentation Generation:** AI agents can generate initial documentation (README, CONTRIBUTING.md, API documentation) based on the codebase and PRD, facilitating community contributions.
*   **Code Review Suggestions:** Agents can provide automated code review suggestions, helping maintain code quality and consistency across contributions.
*   **Issue Triage:** AI can assist in triaging incoming issues and pull requests, categorizing them, and suggesting potential solutions or relevant code sections.

## 5. Future Considerations

*   **Historical Currency Data:** Implement functionality to view historical exchange rate trends and visualize them.
*   **Custom Units/Formulas:** Allow users to define their own custom units or conversion formulas.
*   **Integration with macOS Services:** Explore deeper integration with macOS services beyond the menu bar, such as Share Sheet or Shortcuts app.
*   **Cross-Platform Support:** Extend support to Windows and Linux, leveraging Electron's capabilities.
*   **Advanced Time Zone Features:** Add features like meeting planner across multiple time zones.
*   **Contextual Conversion Suggestions:** Use AI to proactively suggest conversions based on copied text or active application content.

## 6. Open Source Project Details

**Project Name:** Universal Converter

**Repository:** [To be created on GitHub/GitLab]

**License:** MIT License (or similar permissive open-source license)

**Contribution Guidelines:** Detailed guidelines will be provided in the `CONTRIBUTING.md` file, encouraging community involvement in development, testing, and documentation.

**Community:** A dedicated communication channel (e.g., Discord, GitHub Discussions) will be established for community engagement.

## 7. References

[1] ExchangeRate-API. (n.d.). *Real-Time and Historical Currency Data with Exchange Rates API*. Retrieved from https://www.exchangerate-api.com/
[2] Open Exchange Rates. (n.d.). *Live and historical exchange rates for over 200 world currencies*. Retrieved from https://openexchangerates.org/
[3] Frankfurter. (n.d.). *Free exchange rates and currency data API*. Retrieved from https://frankfurter.dev/
[4] World Time API. (n.d.). *Simple JSON/plain-text API to obtain the current local time*. Retrieved from https://worldtimeapi.org/
[5] TimeZoneDB. (n.d.). *Free Time Zone Database & API*. Retrieved from https://timezonedb.com/
[6] IANA. (n.d.). *Time Zone Database*. Retrieved from https://www.iana.org/time-zones/repository/tz-link.html

