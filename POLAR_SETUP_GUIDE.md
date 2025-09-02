# Polar Setup Guide for Flowvya

## ✅ Completed Steps
- Organization created: **Flowvya** (ID: 8236e879-0c60-4c1b-bdf1-e9d852328cb2)
- API connection working
- Products created in Polar

## 🔴 Missing: Product Prices

Your products don't have prices configured. Here's how to add them in Polar Dashboard:

### 1. **Flowvya - Free** (Product ID: 78c45caf-e3ab-4008-b934-31c21e16149d)
- Go to Products → "Flowvya - Free"
- Add Price:
  - **Monthly**: $0/month
  - **Yearly**: $0/year
  - Type: Recurring
  - Currency: USD

### 2. **Flowvya - Pro** (Product ID: eca2a717-dc2a-4088-b3aa-f9b20b193b0a)
- Go to Products → "Flowvya - Pro"
- Add Prices:
  - **Monthly**: $19.99/month (recurring)
  - **Yearly**: $199.99/year (recurring) - Save $39.89!
  - Currency: USD

### 3. **Flowvya - Multiuser** (Product ID: 2f6aea98-d80a-422c-b3f8-5ab4d3c29842)
This seems to be your Business plan. Add prices:
- **Monthly**: $49.99/month (recurring)
- **Yearly**: $499.99/year (recurring) - Save $99.89!
- Currency: USD

### Missing Product: Enterprise
You need to create one more product in Polar:
- Name: "Flowvya - Enterprise"
- **Monthly**: $99.99/month
- **Yearly**: $999.99/year - Save $199.89!

## How to Add Prices in Polar

1. Go to [Polar Dashboard](https://dashboard.polar.sh)
2. Navigate to **Products**
3. Click on each product
4. Click **"Add Price"**
5. Configure:
   - Type: **Recurring**
   - Interval: **Month** or **Year**
   - Amount: Enter price in dollars
   - Currency: **USD**
6. Save the price

## After Adding Prices

Run the test endpoint again: http://localhost:3000/api/polar/test

It will show the price IDs, then we can sync everything to your database.