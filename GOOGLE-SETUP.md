# Switching on "Connect my Google account"

You do this once, when the site is live on its own web address. It takes about ten minutes.
After that, Laura presses **Connect my Google account** in the Studio, signs in, presses Allow, and she's done.

You'll come away with two things: a **client ID** and a **client secret**. They let the site ask Google for permission on Laura's behalf.

## 1. Make a project

1. Go to https://console.cloud.google.com and sign in. Laura's Google account is best, but yours works too.
2. At the top, open the project list and choose **New project**. Call it `The Occasion Edit`, then press **Create**.

## 2. Turn on Drive, Sheets and Gmail

1. In the search bar at the top, search for **Google Drive API**, open it and press **Enable**.
2. Do the same for **Google Sheets API** and **Gmail API**.

## 3. Describe the app

1. Search for **Google Auth Platform** and open it, then press **Get started**.
2. For **App name**, type `The Occasion Edit`. For **Support email**, choose Laura's email.
3. For **Audience**, choose **External**.
4. Add Laura's email as the contact, agree to the policy and press **Create**.

## 4. Say what the site may do

1. In Google Auth Platform, open **Data access**, then **Add or remove scopes**.
2. Tick these (use the filter box to find each one):
   - `.../auth/drive.file`: only files the site makes itself. It can't see the rest of her Drive.
   - `.../auth/gmail.send`: send emails as Laura.
   - `.../auth/gmail.readonly`: read emails, so customer conversations show on their orders.
3. Press **Update**, then **Save**.

## 5. Publish it

1. Open **Audience** and press **Publish app**, then confirm.
   Without this step, Google signs Laura out every 7 days.
2. Because the site reads Gmail, Google shows a "Google hasn't verified this app" screen when Laura connects. That's expected for a business's own site. She chooses **Advanced**, then **Go to The Occasion Edit**. Google's full review is only needed for apps used by more than 100 people.

## 6. Make the client ID and secret

1. Open **Clients**, then **Create client**.
2. For **Application type**, choose **Web application**. For **Name**, type `Website`.
3. Under **Authorised redirect URIs**, press **Add URI** and paste the address from the Studio:
   **Paperwork, then "For Oliver: switch on Google sign-in"**.
   It looks like `https://your-domain/api/google/callback` and must match exactly.
4. Press **Create**. Copy the **Client ID** and **Client secret**.

## 7. Give them to the site

Use either of these:

- **In the Studio:** go to Paperwork, open "For Oliver: switch on Google sign-in", paste both and press **Switch on Google sign-in**. The secret is stored encrypted on the server.
- **On the server:** set the `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables. If the site sits behind a proxy, also set `OE_PUBLIC_URL` to its address, e.g. `https://theoccasionedit.co.uk`.

## 8. Laura connects

Laura opens the Studio, goes to **Paperwork** and presses **Connect my Google account**. Once she allows access, the site:

- builds `THE Occasion Edit` in her Drive, with a `Tax Year 2026-27` folder holding Quotes, Invoices and Receipts, plus Photos
- makes the master sheet with three tabs: Enquiries & Orders, Income & Expenses, and Quotes & Invoices
- copies her existing orders into the sheet

From then on:

- every new enquiry, status change and payment updates the sheet
- every quote and invoice is filed as a PDF
- she can email customers from their order, with the PDF attached
- their replies show on the order when she opens it or presses **Check for new emails**

She can disconnect at any time in Paperwork. Her folders and sheet stay in her Drive.
