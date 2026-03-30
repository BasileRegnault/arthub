import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  OnInit,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload.component.html',
})
export class FileUploadComponent implements OnInit, OnChanges {

  @Input() file: File | null = null;
  @Input() initialPreview: string | null = null;

  @Output() fileChange = new EventEmitter<File | null>();

  preview = signal<string | null>(null);

  ngOnInit() {
    // si déjà fourni au init
    if (this.initialPreview) {
      this.preview.set(this.initialPreview);
    }

    if (this.file) {
      this.updateLocalPreview(this.file);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Si la preview backend arrive apres un appel API :
    if (changes['initialPreview'] && this.initialPreview && !this.file) {
      this.preview.set(this.initialPreview);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.file = file;
    this.fileChange.emit(file);

    if (file) {
      this.updateLocalPreview(file);
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();

    const file = event.dataTransfer?.files?.[0] ?? null;

    this.file = file;
    this.fileChange.emit(file);

    if (file) {
      this.updateLocalPreview(file);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  private updateLocalPreview(file: File) {
    const reader = new FileReader();
    reader.onload = e => this.preview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }
}
