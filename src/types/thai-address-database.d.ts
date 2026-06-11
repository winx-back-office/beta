declare module "thai-address-database" {
  interface AddressEntry {
    district: string;
    amphoe: string;
    province: string;
    zipcode: string;
  }
  export function searchAddressByDistrict(q: string): AddressEntry[];
  export function searchAddressByAmphoe(q: string): AddressEntry[];
  export function searchAddressByProvince(q: string): AddressEntry[];
  export function searchAddressByZipcode(q: string): AddressEntry[];
}
