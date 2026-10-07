// Stored units are integers so money, fuel and distance stay exact:
//   odometer / distance: tenths of a km
//   volume:              millilitres
//   money:               paise
// These helpers are the only place that converts between stored and display values.

export function kmToTenths(km: number) {
  return Math.round(km * 10);
}

export function tenthsToKm(tenths: number) {
  return tenths / 10;
}

export function litresToMl(litres: number) {
  return Math.round(litres * 1000);
}

export function mlToLitres(ml: number) {
  return ml / 1000;
}

export function rupeesToPaise(rupees: number) {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number) {
  return paise / 100;
}

// Litres bought for an amount at a price per litre, in ml.
export function volumeFromAmount(amountPaise: number, pricePaise: number) {
  return pricePaise > 0 ? Math.round((amountPaise / pricePaise) * 1000) : 0;
}

// Amount paid for a volume at a price per litre, in paise.
export function amountFromVolume(volumeMl: number, pricePaise: number) {
  return Math.round((volumeMl / 1000) * pricePaise);
}

// Price per litre for an amount and volume, in paise.
export function priceFromAmount(amountPaise: number, volumeMl: number) {
  return volumeMl > 0 ? Math.round(amountPaise / (volumeMl / 1000)) : 0;
}
