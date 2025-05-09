/**
 * @fileoverview Type definitions for ipinfo and lru-cache modules.
 * @module types
 */

/**
 * Declaration for the ipinfo module that provides IP geolocation data.
 * @namespace ipinfo
 */
declare module "ipinfo" {
  /**
   * Interface representing location data returned by the ipinfo API.
   * @interface LocationData
   * @memberof ipinfo
   * @property {string} city - The city name associated with the IP address
   * @property {string} region - The region or state associated with the IP address
   * @property {string} country - The country code associated with the IP address
   */
  interface LocationData {
    city: string;
    region: string;
    country: string;
  }

  /**
   * Function to retrieve location information for an IP address.
   * @function ipinfo
   * @memberof ipinfo
   * @param {string} ip - The IP address to lookup
   * @returns {Promise<LocationData>} Promise resolving to location data
   */
  function ipinfo(ip: string): Promise<LocationData>;

  export = ipinfo;
}

/**
 * Declaration for the lru-cache module used for rate limiting.
 * This is a simple Least Recently Used (LRU) Cache implementation.
 * @namespace lru-cache
 */
declare module "lru-cache" {
  interface LRUCacheOptions<K, V> {
    max?: number;
    ttl?: number;
    allowStale?: boolean;
    updateAgeOnGet?: boolean;
    updateAgeOnHas?: boolean;
    [key: string]: any;
  }

  class LRUCache<K, V> {
    constructor(options?: LRUCacheOptions<K, V>);
    set(key: K, value: V, options?: { ttl?: number }): boolean;
    get(key: K): V | undefined;
    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
    size: number;
  }

  // Allow both default and named export patterns to support different import styles
  export = LRUCache;
}
