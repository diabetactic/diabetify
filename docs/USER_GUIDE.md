# Diabetactic User Guide

**Welcome to Diabetactic!** Your friendly companion for managing diabetes. This guide will help you get started with the app and make the most of its features.

**Note**: This app is also known as "Diabetify" in some contexts. Both names refer to the same application.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Adding Glucose Readings](#adding-glucose-readings)
4. [Viewing Your Readings](#viewing-your-readings)
5. [Managing Appointments](#managing-appointments)
6. [Settings and Profile](#settings-and-profile)
7. [Kids Mode](#kids-mode)
8. [Offline Use](#offline-use)
9. [Getting Help](#getting-help)

---

## Getting Started

### First Time Login

When you first open Diabetactic, you'll see a colorful welcome screen with a friendly illustration. This app is designed especially for kids aged 6-14 to help manage their diabetes with confidence!

**To log in:**

1. Tap the login button on the welcome screen
2. Enter your email and password provided by your hospital or healthcare team
3. Tap "Sign In"

> **Note:** Registration is handled by your healthcare provider. If you don't have login credentials, please contact your diabetes care team at the hospital.

### Account Status

After logging in, your account may be in one of these states:

- **Active**: You can use all features of the app
- **Pending**: Your account is being reviewed by the hospital team. You'll receive an email when it's activated.
- **Need help?** If you have questions about your account, contact the support email shown on screen.

---

## Dashboard Overview

The Dashboard is your home base! It shows you everything important at a glance.

### What You'll See

**Quick Stats** (Kid-Friendly View)

- **Smiley Face Status**: Shows how you're doing overall
  - Happy face = You're doing amazing! (70% or more time in good range)
  - Neutral face = Good job! Keep it up! (50-70% time in range)
  - Needs work face = Let's work on this together (less than 50% in range)

- **Time in Good Range**: How much of the time your sugar levels are just right
- **Average Sugar**: Your typical glucose level
- **Recent Readings**: Your last few glucose checks

**Quick Actions**

- **Add Reading** button (the big blue circle with a plus sign)
- **Sync** button to update your data
- **View All Readings** to see your complete history

### Parent/Technical View

If you're a parent or guardian, tap "More Details" to see:

- Estimated HbA1c (shows average blood glucose over 2-3 months)
- GMI (Glucose Management Indicator)
- Coefficient of Variation (how much glucose levels vary)
- Detailed sync status

---

## Adding Glucose Readings

Recording your glucose readings is quick and easy!

### How to Add a Reading

1. **From the Dashboard**, tap the big blue button with a plus sign (+)
   - You can also use the "Add Reading" button in the Readings tab

2. **Enter Your Glucose Value**
   - Type in the number from your glucose meter
   - The app works with both mg/dL and mmol/L (you can change this in Settings)

3. **Set the Date and Time**
   - Usually, this is already set to "right now"
   - Tap to change if you're entering an older reading

4. **Add Meal Context (Optional)**
   - Select when the reading was taken:
     - Before Breakfast
     - After Breakfast
     - Before Lunch
     - After Lunch
     - Before Dinner
     - After Dinner
     - Bedtime
     - Fasting
     - Other

5. **Add Notes (Optional)**
   - Write anything special about this reading
   - Examples: "Felt shaky," "After playing soccer," "Birthday party"

6. **Tap "Save Reading"**

Your reading is saved immediately! It's stored on your phone and will sync with the hospital system when you have internet.

### Tips for Accurate Readings

- Wash and dry your hands before testing
- Use the side of your fingertip, not the pad
- Make sure your hands are warm for better blood flow
- Record the reading right after you take it so you don't forget

---

## Viewing Your Readings

The Readings page shows all your glucose measurements in one place.

### Features

**Search and Filter**

- Search by notes or tags
- Filter by date range (today, this week, this month, etc.)
- Filter by glucose status (very low, low, normal, high, very high)
- Sort by newest first, oldest first, high to low, or low to high

**Reading Details**
Each reading shows:

- Glucose value with color-coded status
- Date and time
- Meal context (if you added it)
- Any notes you wrote
- Sync status (whether it's uploaded to the hospital)

**Quick Actions**

- Tap a reading to view full details
- Pull down to refresh and sync with the hospital
- Tap the search icon to find specific readings

---

## Managing Appointments

Keep track of your doctor visits and checkups.

### Viewing Appointments

The Appointments page shows:

- **Current/Upcoming**: Your next scheduled visit
- **Past Appointments**: History of previous visits

### Appointment Details

For each appointment, you'll see:

- Date and time
- Doctor's name
- Location (or "Video Call" if online)
- Appointment type (routine control, follow-up, consultation, etc.)
- Any special notes

### Requesting an Appointment

1. Go to the Appointments tab
2. Tap "Request Appointment"
3. Wait for the hospital to accept your request
4. Once accepted, fill in the appointment form with:
   - Why you need the appointment (routine control, follow-up, etc.)
   - Your current insulin information
   - Any questions or concerns

### Appointment Notifications

The app will remind you about upcoming appointments:

- 24 hours before
- 1 hour before
- At the appointment time

Make sure notifications are enabled in Settings!

---

## Settings and Profile

Personalize your app experience in the Settings menu.

### How to Access Settings

1. Tap the Profile tab at the bottom
2. Or tap the menu icon (three lines) and select Settings

### Available Settings

**Profile Information**

- Name
- Email
- Phone number
- Date of birth

**Preferences**

- **Glucose Unit**: Choose mg/dL or mmol/L
- **Language**: English or Spanish
- **Theme**: Light mode, dark mode, or match your phone's setting
- **Target Range**: Set your personal glucose target range (usually 70-180 mg/dL)

**Notifications**

- Appointment reminders
- Reading reminders
- General notifications

**Reading Reminders**

- Set up to 4 daily reminders to check your glucose
- Example: "Breakfast - 8:00 AM," "Bedtime - 9:00 PM"
- Turn individual reminders on or off

**Glucose Targets**

- Low target: Minimum safe glucose level
- High target: Maximum target glucose level
- These help calculate your "time in range"

### Tidepool Integration

If your healthcare team uses Tidepool, you can connect your account:

1. Go to Profile or Settings
2. Tap "Connect to Tidepool"
3. Log in with your Tidepool credentials
4. Your data will sync automatically

**What is Tidepool?**
Tidepool is a service that lets you share your diabetes data with your healthcare team, family members, and other diabetes apps.

---

## Kids Mode

Diabetactic is designed to be fun and encouraging for kids!

### Kid-Friendly Features

**Simple Language**

- "Sugar levels" instead of "glucose readings"
- "Time in Good Range" instead of "time in range percentage"
- Friendly messages like "You're doing amazing!"

**Cheerful Design**

- Bright colors with Tailwind CSS + DaisyUI styling
- Smiley face status indicators
- Friendly welcome illustrations

**Encouragement**

- Positive messages when you check your readings
- Fun quotes on the welcome screen
- Celebration when you stay in range

### Switching Between Views

Parents can toggle between:

- **Kid View**: Simple stats and encouraging messages
- **Parent View**: Detailed medical information and technical metrics

Tap "Parent View" or "More Details" on the Dashboard to see technical information like HbA1c, GMI, and coefficient of variation.

---

## Offline Use

Diabetactic works even without internet!

### How It Works

1. **Everything is saved locally** on your phone first
2. **Data syncs automatically** when you have internet
3. **View all your readings** anytime, online or offline

### What Works Offline

- Adding new glucose readings
- Viewing past readings
- Checking your dashboard stats
- Viewing appointments

### What Needs Internet

- Syncing data with the hospital
- Requesting new appointments
- Connecting to Tidepool
- Getting the latest data from your healthcare team

### Syncing Your Data

**Automatic Sync**
The app syncs automatically when:

- You open the app with internet
- You pull down to refresh on the Dashboard or Readings page

**Manual Sync**
Tap the sync button (circular arrow icon) on the Dashboard to sync immediately.

**Sync Status**
Look for these indicators:

- "Synced" (green checkmark): Data is up-to-date
- "Syncing..." (spinning icon): Upload in progress
- "Failed" (red X): Something went wrong, try again

---

## Getting Help

### Common Questions

**Q: I forgot my password. What do I do?**
A: Contact your hospital's diabetes care team. They manage all accounts and can reset your password.

**Q: My readings aren't syncing. What's wrong?**
A:

1. Check your internet connection
2. Try pulling down to refresh on the Dashboard
3. Tap the sync button
4. If still not working, close and reopen the app

**Q: Can I use this app if I'm younger than 6 or older than 14?**
A: Yes! While the app is designed for kids 6-14, people of any age with diabetes can use it. The "Parent View" has more detailed information for adults.

**Q: Will my data be shared with anyone?**
A: Your data is only shared with your healthcare team at the hospital. If you connect to Tidepool, you control who sees your Tidepool data. See the [Parent Guide](PARENT_GUIDE.md) for more about privacy.

**Q: What if I want to delete a reading?**
A: Currently, you can view and add readings. To delete a reading, please contact your healthcare team.

**Q: The app is in Spanish. How do I change to English?**
A: Go to Settings → Language → Select "English"

### Technical Support

For technical issues or questions:

- Check the app's Help section in Settings
- Contact your hospital's diabetes care team
- Email: [Your hospital's support email]

### Emergency

**This app is not for emergencies!**
If you have:

- Very low blood sugar (below 70 mg/dL or 3.9 mmol/L) with symptoms
- Very high blood sugar (above 300 mg/dL or 16.7 mmol/L)
- Feel very unwell

**Take action:**

1. Follow your diabetes emergency plan
2. Tell a parent or trusted adult
3. Contact your doctor or go to the emergency room

---

## Tips for Success

1. **Check regularly**: Test your glucose at the times your doctor recommended
2. **Record right away**: Add readings to the app as soon as you test
3. **Add notes**: Writing what you were doing helps you and your doctor understand patterns
4. **Sync often**: Keep your data up-to-date by syncing regularly
5. **Keep appointments**: Don't miss your checkups with your diabetes team
6. **Ask questions**: Use the notes field to write questions for your doctor

---

## Glossary

- **Glucose/Blood Sugar**: The amount of sugar in your blood. Too high or too low can make you feel sick.
- **Time in Range**: The percentage of time your glucose is in the healthy target range (usually 70-180 mg/dL)
- **HbA1c**: A test that shows your average blood sugar over the past 2-3 months
- **CGM**: Continuous Glucose Monitor - a device that checks your sugar automatically
- **Sync**: Uploading your data to the hospital's computer system
- **mg/dL and mmol/L**: Two different ways to measure glucose (like inches and centimeters for height)

---

## What's Next?

Now that you know how to use Diabetactic, you're ready to take charge of managing your diabetes! Remember:

- **You're not alone**: Your family, doctors, and this app are here to help
- **Small steps matter**: Every reading you record helps you stay healthy
- **Be proud**: Managing diabetes takes courage and you're doing great!

**For parents and guardians**, check out the [Parent Guide](PARENT_GUIDE.md) for more detailed information about data security, Tidepool integration, and understanding glucose metrics.

---

**App Version:** 0.0.1
**Last Updated:** November 2025
**Technology**: Built with Ionic 8, Angular 20, Capacitor 6, and Tailwind CSS

_Diabetactic is a companion tool for diabetes management. Always follow your healthcare provider's medical advice._

---

**Related Documentation**:

- [Parent Guide](PARENT_GUIDE.md) - Detailed guide for parents and guardians
- [Backend Mode Guide](BACKEND_MODE_GUIDE.md) - For developers/IT administrators
- [Android Quick Start](ANDROID_QUICK_START.md) - Mobile app installation guide
