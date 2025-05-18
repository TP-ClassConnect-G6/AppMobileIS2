// Archivo para manejar la búsqueda de direcciones utilizando la API Nominatim de OpenStreetMap
import axios from 'axios';

// Tipo para los resultados de la búsqueda
export type NominatimResult = {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  address: {
    city?: string;
    state?: string;
    country?: string;
    country_code?: string;
    [key: string]: string | undefined;
  };
};

// Función para buscar ubicaciones por texto
export const searchLocationByText = async (query: string): Promise<NominatimResult[]> => {
  try {
    // Asegurar que el User-Agent esté configurado para cumplir con los términos de uso de Nominatim
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: query,
        format: 'json',
        addressdetails: 1,
        limit: 5, // Limitar a 5 resultados
      },
      headers: {
        'User-Agent': 'AppMobileIS2', // Es importante identificar tu aplicación
        'Accept-Language': 'es', // Resultados en español
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error al buscar ubicaciones:', error);
    return [];
  }
};

// Función para formatear el resultado en un formato legible
export const formatLocation = (result: NominatimResult): string => {
  const address = result.address || {};
  
  // Intentamos extraer ciudad/localidad, estado/provincia y país
  const city = address.city || address.town || address.village || address.hamlet;
  const state = address.state || address.province;
  const country = address.country;

  // Construimos un string formateado con los componentes disponibles
  const parts = [city, state, country].filter(Boolean);
  
  return parts.length > 0 ? parts.join(', ') : result.display_name;
};
