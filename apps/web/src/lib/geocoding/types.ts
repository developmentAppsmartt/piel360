/** Dirección resuelta, con las coordenadas y los datos administrativos que
 * guardan los formularios (país en ISO-3166 alfa-2). */
export type ResolvedAddress = {
  address: string;
  lat: number;
  lng: number;
  city: string;
  department: string;
  country: string;
  zip: string;
};

/** Sugerencia de la búsqueda. Google no da coordenadas hasta pedir el
 * detalle del lugar, por eso se resuelve al elegirla. */
export type AddressOption = {
  id: string;
  label: string;
  resolve: () => Promise<ResolvedAddress | null>;
};
