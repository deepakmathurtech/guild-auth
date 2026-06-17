export interface StateData {
  id: string;
  name: string;
  code: string; // e.g. PB for Punjab
  capital: string;
}

export const INDIAN_STATES: StateData[] = [
  { id: 'pb', name: 'Punjab', code: 'PB', capital: 'Chandigarh' },
  { id: 'hr', name: 'Haryana', code: 'HR', capital: 'Chandigarh' },
  { id: 'mh', name: 'Maharashtra', code: 'MH', capital: 'Mumbai' },
  { id: 'tn', name: 'Tamil Nadu', code: 'TN', capital: 'Chennai' },
  { id: 'ka', name: 'Karnataka', code: 'KA', capital: 'Bengaluru' },
  { id: 'dl', name: 'Delhi', code: 'DL', capital: 'New Delhi' },
  { id: 'gj', name: 'Gujarat', code: 'GJ', capital: 'Gandhinagar' },
  { id: 'rj', name: 'Rajasthan', code: 'RJ', capital: 'Jaipur' },
  { id: 'up', name: 'Uttar Pradesh', code: 'UP', capital: 'Lucknow' },
  { id: 'wb', name: 'West Bengal', code: 'WB', capital: 'Kolkata' },
  { id: 'ts', name: 'Telangana', code: 'TS', capital: 'Hyderabad' },
  { id: 'ap', name: 'Andhra Pradesh', code: 'AP', capital: 'Amaravati' },
  { id: 'kl', name: 'Kerala', code: 'KL', capital: 'Thiruvananthapuram' },
  { id: 'mp', name: 'Madhya Pradesh', code: 'MP', capital: 'Bhopal' },
  { id: 'br', name: 'Bihar', code: 'BR', capital: 'Patna' },
  { id: 'or', name: 'Odisha', code: 'OR', capital: 'Bhubaneswar' },
  { id: 'ct', name: 'Chhattisgarh', code: 'CT', capital: 'Raipur' },
  { id: 'jh', name: 'Jharkhand', code: 'JH', capital: 'Ranchi' },
  { id: 'as', name: 'Assam', code: 'AS', capital: 'Dispur' },
  { id: 'hp', name: 'Himachal Pradesh', code: 'HP', capital: 'Shimla' },
  { id: 'uk', name: 'Uttarakhand', code: 'UK', capital: 'Dehradun' },
  { id: 'ga', name: 'Goa', code: 'GA', capital: 'Panaji' },
  { id: 'jk', name: 'Jammu & Kashmir', code: 'JK', capital: 'Srinagar' },
  { id: 'la', name: 'Ladakh', code: 'LA', capital: 'Leh' },
  { id: 'py', name: 'Puducherry', code: 'PY', capital: 'Puducherry' },
  { id: 'ch', name: 'Chandigarh', code: 'CH', capital: 'Chandigarh' }
  // ... can expand to full 36 if needed
];

export function getStateByCode(code: string) {
  return INDIAN_STATES.find(s => s.code === code);
}

export function getStateByName(name: string) {
  return INDIAN_STATES.find(s => s.name === name);
}

export function getCityCode(cityName: string): string {
  return cityName.substring(0, 3).toUpperCase();
}
