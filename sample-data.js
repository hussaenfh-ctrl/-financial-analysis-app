/* sample-data.js
 * بيانات تجريبية (بالآلاف) لثلاث سنوات مالية - لتجربة الأداة فورًا
 */
window.FA = window.FA || {};

FA.sampleData = {
  periods: [
    {
      label: "2022",
      values: {
        revenue: 10000000, cogs: 6500000, opex: 1800000, depreciation: 300000,
        interestExpense: 250000, otherIncomeExpense: 50000, incomeTax: 250000,
        cash: 900000, accountsReceivable: 1400000, inventory: 1600000, otherCurrentAssets: 200000,
        netFixedAssets: 4000000, otherNonCurrentAssets: 400000,
        accountsPayable: 1100000, shortTermDebt: 700000, otherCurrentLiabilities: 200000,
        longTermDebt: 2200000, otherNonCurrentLiabilities: 100000,
        shareCapital: 2500000, retainedEarnings: 1500000, otherEquity: 200000
      }
    },
    {
      label: "2023",
      values: {
        revenue: 11500000, cogs: 7300000, opex: 2000000, depreciation: 320000,
        interestExpense: 260000, otherIncomeExpense: 40000, incomeTax: 320000,
        cash: 1000000, accountsReceivable: 1700000, inventory: 1900000, otherCurrentAssets: 250000,
        netFixedAssets: 4300000, otherNonCurrentAssets: 320000,
        accountsPayable: 1250000, shortTermDebt: 650000, otherCurrentLiabilities: 220000,
        longTermDebt: 2300000, otherNonCurrentLiabilities: 120000,
        shareCapital: 2500000, retainedEarnings: 2230000, otherEquity: 200000
      }
    },
    {
      label: "2024",
      values: {
        revenue: 13200000, cogs: 8200000, opex: 2300000, depreciation: 350000,
        interestExpense: 270000, otherIncomeExpense: 60000, incomeTax: 420000,
        cash: 1150000, accountsReceivable: 2000000, inventory: 2300000, otherCurrentAssets: 300000,
        netFixedAssets: 4600000, otherNonCurrentAssets: 350000,
        accountsPayable: 1450000, shortTermDebt: 600000, otherCurrentLiabilities: 250000,
        longTermDebt: 2400000, otherNonCurrentLiabilities: 130000,
        shareCapital: 2500000, retainedEarnings: 3150000, otherEquity: 220000
      }
    }
  ]
};
