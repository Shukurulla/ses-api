const https = require('https');
const http = require('http');

/**
 * OpenStreetMap Nominatim API bilan ishlash uchun service
 * Roles.tz talabi: Ish joyini OpenStreetMap orqali qidirish va location olish
 */

class OpenStreetMapService {
  constructor() {
    this.baseUrl = 'https://nominatim.openstreetmap.org';
    this.userAgent = 'SES-Nukus-Application/1.0';
  }

  /**
   * Joyni qidirish (search)
   * @param {string} query - Qidiruv so'zi
   * @param {Object} options - Qo'shimcha parametrlar
   * @returns {Promise<Array>} - Topilgan joylar ro'yxati
   */
  async search(query, options = {}) {
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: options.limit || 10,
        ...options
      });

      const url = `${this.baseUrl}/search?${params.toString()}`;
      const data = await this.makeRequest(url);

      return data.map(item => this.formatSearchResult(item));
    } catch (error) {
      throw new Error(`OpenStreetMap search error: ${error.message}`);
    }
  }

  /**
   * Nukus shahrida joy qidirish
   * @param {string} query - Qidiruv so'zi
   * @param {Object} options - Qo'shimcha parametrlar
   * @returns {Promise<Array>} - Topilgan joylar ro'yxati
   */
  async searchInNukus(query, options = {}) {
    const searchQuery = `${query}, Nukus, Karakalpakstan, Uzbekistan`;
    return await this.search(searchQuery, {
      ...options,
      bounded: '1',
      viewbox: '59.5,42.4,60.0,42.6' // Nukus shahar hududi
    });
  }

  /**
   * Koordinatalar bo'yicha joy ma'lumotini olish (reverse geocoding)
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<Object>} - Joy ma'lumotlari
   */
  async reverse(lat, lon) {
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        format: 'json',
        addressdetails: '1'
      });

      const url = `${this.baseUrl}/reverse?${params.toString()}`;
      const data = await this.makeRequest(url);

      return this.formatReverseResult(data);
    } catch (error) {
      throw new Error(`OpenStreetMap reverse geocoding error: ${error.message}`);
    }
  }

  /**
   * Place ID bo'yicha batafsil ma'lumot olish
   * @param {string} placeId - OSM Place ID
   * @returns {Promise<Object>} - Joy haqida batafsil ma'lumot
   */
  async lookup(placeId) {
    try {
      const params = new URLSearchParams({
        osm_ids: placeId,
        format: 'json',
        addressdetails: '1'
      });

      const url = `${this.baseUrl}/lookup?${params.toString()}`;
      const data = await this.makeRequest(url);

      if (data && data.length > 0) {
        return this.formatSearchResult(data[0]);
      }

      throw new Error('Place not found');
    } catch (error) {
      throw new Error(`OpenStreetMap lookup error: ${error.message}`);
    }
  }

  /**
   * HTTP request yuborish
   * @param {string} url - So'rov URL
   * @returns {Promise<any>} - Response data
   */
  makeRequest(url) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      const options = {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        }
      };

      protocol.get(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (error) {
            reject(new Error(`JSON parse error: ${error.message}`));
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Search natijasini formatlash
   * @param {Object} item - OSM natija
   * @returns {Object} - Formatlangan natija
   */
  formatSearchResult(item) {
    return {
      placeId: item.place_id,
      osmType: item.osm_type,
      osmId: item.osm_id,
      displayName: item.display_name,
      name: item.name || item.display_name.split(',')[0],
      address: item.address || {},
      location: {
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon)
      },
      boundingbox: item.boundingbox,
      class: item.class,
      type: item.type,
      importance: item.importance,
      icon: item.icon
    };
  }

  /**
   * Reverse geocoding natijasini formatlash
   * @param {Object} data - OSM natija
   * @returns {Object} - Formatlangan natija
   */
  formatReverseResult(data) {
    return {
      placeId: data.place_id,
      osmType: data.osm_type,
      osmId: data.osm_id,
      displayName: data.display_name,
      name: data.name || data.display_name.split(',')[0],
      address: data.address || {},
      location: {
        lat: parseFloat(data.lat),
        lon: parseFloat(data.lon)
      },
      boundingbox: data.boundingbox,
      class: data.class,
      type: data.type
    };
  }

  /**
   * Ikkita koordinata orasidagi masofani hisoblash (km)
   * Haversine formula
   * @param {number} lat1 - Birinchi nuqta latitude
   * @param {number} lon1 - Birinchi nuqta longitude
   * @param {number} lat2 - Ikkinchi nuqta latitude
   * @param {number} lon2 - Ikkinchi nuqta longitude
   * @returns {number} - Masofa (km)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Yerning radiusi km da
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * Darajani radianga o'tkazish
   * @param {number} deg - Daraja
   * @returns {number} - Radian
   */
  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Dezinfektor belgilangan joyga yetib kelganini tekshirish
   * @param {number} targetLat - Belgilangan joy latitude
   * @param {number} targetLon - Belgilangan joy longitude
   * @param {number} currentLat - Hozirgi joy latitude
   * @param {number} currentLon - Hozirgi joy longitude
   * @param {number} threshold - Chegaraviy masofa (metrda, default 100m)
   * @returns {Object} - Tekshiruv natijasi
   */
  checkArrival(targetLat, targetLon, currentLat, currentLon, threshold = 0.1) {
    const distance = this.calculateDistance(targetLat, targetLon, currentLat, currentLon);
    const distanceInMeters = distance * 1000;

    return {
      arrived: distanceInMeters <= threshold,
      distance: distanceInMeters,
      distanceInKm: distance,
      threshold: threshold
    };
  }
}

module.exports = new OpenStreetMapService();
