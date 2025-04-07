import 'dart:convert';
import 'package:http/http.dart' as http;

class WeatherService {
  static const String _baseUrl = 'https://api.openweathermap.org/data/2.5';
  static const String _apiKey = '5cc55aa0a18fcbac035128efb4996d1a';

  Future<Map<String, dynamic>> getWeather(String city, [String? countryCode]) async {
    try {
      final query = countryCode != null ? '$city,$countryCode' : city;
      final response = await http.get(
        Uri.parse('$_baseUrl/weather?q=$query&appid=$_apiKey&units=metric'),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'temperature': data['main']['temp'],
          'condition': data['weather'][0]['main'],
          'description': data['weather'][0]['description'],
          'humidity': data['main']['humidity'],
          'windSpeed': data['wind']['speed'],
          'location': '${data['name']}, ${data['sys']['country']}',
          'icon': data['weather'][0]['icon'],
        };
      } else {
        throw 'Failed to get weather data: ${response.statusCode}';
      }
    } catch (e) {
      throw 'Error getting weather data: $e';
    }
  }

  String getWeatherIconUrl(String iconCode) {
    return 'https://openweathermap.org/img/wn/$iconCode@2x.png';
  }
} 