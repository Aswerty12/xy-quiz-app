import { Directive, EventEmitter, HostBinding, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[appDragDrop]',
  standalone: true
})
export class DragDropDirective {
  @Output() fileDropped = new EventEmitter<File>();

  @HostBinding('class.bg-blue-50') fileOver: boolean = false;
  @HostBinding('class.border-blue-500') fileOverBorder: boolean = false;
  @HostBinding('class.border-gray-300') defaultBorder: boolean = true;

  // Dragover listener
  @HostListener('dragover', ['$event']) onDragOver(evt: DragEvent) {
    evt.preventDefault();
    evt.stopPropagation();
    this.fileOver = true;
    this.fileOverBorder = true;
    this.defaultBorder = false;
  }

  // Dragleave listener
  @HostListener('dragleave', ['$event']) public onDragLeave(evt: DragEvent) {
    evt.preventDefault();
    evt.stopPropagation();
    this.fileOver = false;
    this.fileOverBorder = false;
    this.defaultBorder = true;
  }

  // Drop listener
  @HostListener('drop', ['$event']) public ondrop(evt: DragEvent) {
    evt.preventDefault();
    evt.stopPropagation();
    this.fileOver = false;
    this.fileOverBorder = false;
    this.defaultBorder = true;

    if (evt.dataTransfer?.files && evt.dataTransfer.files.length > 0) {
      const file = evt.dataTransfer.files[0];
      this.fileDropped.emit(file);
    }
  }
}