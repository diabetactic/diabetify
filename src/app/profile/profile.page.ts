import { Component } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

@Component({
  selector: 'app-profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss'],
  providers: [Storage]
})
export class ProfilePage {
  user = {
    name: '',
    age: null,
    // Añadir más propiedades si es necesario
  };

  constructor(private storage: Storage) {
    this.loadProfile();
  }

  async loadProfile() {
    await this.storage.create();
    const storedUser = await this.storage.get('user');
    if (storedUser) {
      this.user = storedUser;
    }
  }

  async saveProfile() {
    await this.storage.set('user', this.user);
    // Mostrar una confirmación al usuario
    alert('Perfil guardado exitosamente.');
  }
}
