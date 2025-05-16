import axios from 'axios';

// Lista de ciudades comunes para buscar localmente
export const COMMON_CITIES = [
  "Ciudad de México, México",
  "Buenos Aires, Argentina",
  "Lima, Perú",
  "Bogotá, Colombia",
  "Santiago, Chile",
  "Madrid, España",
  "Barcelona, España",
  "New York, USA",
  "Los Angeles, USA",
  "Tokyo, Japón",
  "Paris, Francia",
  "Londres, Inglaterra",
  "Berlin, Alemania",
  "Roma, Italia",
  "São Paulo, Brasil",
  "Rio de Janeiro, Brasil",
  "Caracas, Venezuela",
  "La Habana, Cuba",
  "Quito, Ecuador",
  "Montevideo, Uruguay",
  "Asunción, Paraguay",
  "La Paz, Bolivia",
  "San José, Costa Rica",
  "Panamá, Panamá",
  "Santo Domingo, República Dominicana",
  "Guatemala, Guatemala",
  "San Salvador, El Salvador",
  "Tegucigalpa, Honduras",
  "Managua, Nicaragua",
];

// Función para buscar ciudades a partir de un texto
export const searchCities = async (text: string): Promise<string[]> => {
  if (!text || text.length < 2) return [];
  
  try {
    // Primero buscamos en nuestra lista local para respuesta rápida
    const localResults = COMMON_CITIES.filter(city => 
      city.toLowerCase().includes(text.toLowerCase())
    ).slice(0, 5);
    
    // Si tenemos resultados locales, los devolvemos inmediatamente
    if (localResults.length > 0) {
      return localResults;
    }
    
    // Si no hay resultados locales y el texto tiene al menos 3 caracteres,
    // intentamos con la API de geocoding de OpenStreetMap (no requiere clave API)
    if (text.length >= 3) {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=5&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'es', // Para resultados en español
            'User-Agent': 'AppMobileIS2' // Identificador requerido por OSM
          }
        }
      );
      
      if (response.data && Array.isArray(response.data)) {
        return response.data.map(item => {
          // Formateamos el resultado a "Ciudad, País"
          const city = item.address.city || item.address.town || item.address.village || '';
          const country = item.address.country || '';
          return city && country ? `${city}, ${country}` : item.display_name;
        });
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error buscando ciudades:', error);
    return []; // En caso de error, devolvemos un array vacío
  }
};