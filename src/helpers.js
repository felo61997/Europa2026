export const fmtD = n => Number(n||0).toLocaleString("es-CL", { minimumFractionDigits:2, maximumFractionDigits:2 });
export const fmtI = n => Number(n||0).toLocaleString("es-CL", { minimumFractionDigits:0, maximumFractionDigits:0 });
export const today = () => new Date().toISOString().split("T")[0];
export const toUSD = (amount, currency, rates) => Number(amount) * (rates[currency] || 1);

export async function fetchRates() {
  try {
    const res  = await fetch("https://api.frankfurter.app/latest?from=USD&to=EUR,CLP");
    const data = await res.json();
    return { USD:1, EUR: data.rates.EUR || 1.08, CLP: data.rates.CLP || 0.00105 };
  } catch {
    return { USD:1, EUR:1.08, CLP:0.00105 };
  }
}
