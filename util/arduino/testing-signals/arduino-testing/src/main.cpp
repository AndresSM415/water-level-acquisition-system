#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <LibPrintf.h>

const int sensor1Pin = A0;   // Analog input 1
const int sensor2Pin = A1;   // Analog input 2
const int pwmOut1 = 10;       // PWM output 1
const int pwmOut2 = 11;      // PWM output 2
const int fys401_1 = 5;       // fy-s401 output 1 1
const int fys401_2 = 6;      // fy-s401 output 2


void setup() {
  Serial.begin(9600);
  pinMode(sensor1Pin, INPUT);
  pinMode(sensor2Pin, INPUT);
  pinMode(pwmOut1, OUTPUT);
  pinMode(pwmOut2, OUTPUT);
  pinMode(fys401_1, OUTPUT);
  pinMode(fys401_2, OUTPUT);
  
  // Set fy-s401 output 1 to mid-level (976 Hz).
  analogWrite(fys401_1, 128); /
  analogWrite(fys401_2, 128);
}

void loop() {
  // Read analog inputs (range: 0–1023)
  int sensor1Value = analogRead(sensor1Pin);
  int sensor2Value = analogRead(sensor2Pin);

  // Map analog values to PWM duty cycle (range: 0–255)
  int pwmValue1 = map(sensor1Value, 0, 1023, 0, 255);
  int pwmValue2 = map(sensor2Value, 0, 1023, 0, 255);

  // Write PWM outputs
  analogWrite(pwmOut1, pwmValue1);
  analogWrite(pwmOut2, pwmValue2);
  
  // Debug output to serial monitor
  printf(
    "Sensor1: %.2fv → PWM: %d\t Sensor2: %.2fv → PWM: %d\n",
    sensor1Value*5/1023.0, sensor1Value, sensor2Value*5/1023.0, sensor2Value
  );
  delay(100); 
}
