declare module 'ipinfo' {
  interface LocationData {
    city: string;
    region: string;
    country: string;
  }

  function ipinfo(ip: string): Promise<LocationData>;

  export = ipinfo;
}