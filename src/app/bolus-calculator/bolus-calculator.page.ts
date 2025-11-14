import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { MockDataService, BolusCalculation } from '../core/services/mock-data.service';

@Component({
  selector: 'app-bolus-calculator',
  templateUrl: './bolus-calculator.page.html',
  styleUrls: ['./bolus-calculator.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, RouterModule],
})
export class BolusCalculatorPage implements OnInit {
  calculatorForm: FormGroup;
  calculating = false;
  result: BolusCalculation | null = null;

  constructor(
    private fb: FormBuilder,
    private mockData: MockDataService,
    private navCtrl: NavController
  ) {
    this.calculatorForm = this.fb.group({
      currentGlucose: ['', [Validators.required, Validators.min(40), Validators.max(600)]],
      carbGrams: ['', [Validators.required, Validators.min(0), Validators.max(300)]],
    });
  }

  ngOnInit() {}

  async calculateBolus() {
    if (!this.calculatorForm.valid) {
      return;
    }

    this.calculating = true;
    const { currentGlucose, carbGrams } = this.calculatorForm.value;

    try {
      this.mockData
        .calculateBolus({
          currentGlucose: parseFloat(currentGlucose),
          carbGrams: parseFloat(carbGrams),
        })
        .subscribe({
          next: result => {
            this.result = result;
            this.calculating = false;
          },
          error: error => {
            console.error('Error calculating bolus:', error);
            this.calculating = false;
          },
        });
    } catch (error) {
      console.error('Error calculating bolus:', error);
      this.calculating = false;
    }
  }

  resetCalculator() {
    this.calculatorForm.reset();
    this.result = null;
  }

  goBack() {
    this.navCtrl.back();
  }

  get glucoseError(): string {
    const control = this.calculatorForm.get('currentGlucose');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'La glucosa actual es requerida';
      if (control.errors['min'] || control.errors['max'])
        return 'Ingresa un valor entre 40 y 600 mg/dL';
    }
    return '';
  }

  get carbsError(): string {
    const control = this.calculatorForm.get('carbGrams');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'Los carbohidratos son requeridos';
      if (control.errors['min'] || control.errors['max'])
        return 'Ingresa un valor entre 0 y 300 gramos';
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.calculatorForm.get(fieldName);
    return !!(field?.invalid && (field?.dirty || field?.touched));
  }
}
