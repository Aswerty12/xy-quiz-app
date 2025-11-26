import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DragDropDirective } from './drag-drop.directive';

// Dummy Component to host the directive
@Component({
  template: `<div appDragDrop (fileDropped)="onFileDropped($event)">Drop Zone</div>`,
  standalone: true,
  imports: [DragDropDirective]
})
class TestComponent {
  onFileDropped(file: File) {}
}

describe('DragDropDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let divElement: DebugElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestComponent, DragDropDirective] // Standalone import
    });
    fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();
    divElement = fixture.debugElement.query(By.css('div'));
  });

  it('should apply "bg-blue-50" class on dragover', () => {
    const event = new DragEvent('dragover');
    divElement.nativeElement.dispatchEvent(event);
    fixture.detectChanges();

    expect(divElement.classes['bg-blue-50']).toBeTrue();
    expect(divElement.classes['border-blue-500']).toBeTrue();
  });

  it('should remove "bg-blue-50" class on dragleave', () => {
    // First trigger dragover
    divElement.nativeElement.dispatchEvent(new DragEvent('dragover'));
    fixture.detectChanges();
    
    // Then trigger dragleave
    divElement.nativeElement.dispatchEvent(new DragEvent('dragleave'));
    fixture.detectChanges();

    expect(divElement.classes['bg-blue-50']).toBeFalsy();
  });

  it('should emit fileDropped event on drop', () => {
    const component = fixture.componentInstance;
    spyOn(component, 'onFileDropped');

    // Mock File Drop Event
    const mockFile = new File([''], 'test.zip');
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(mockFile);
    
    const event = new DragEvent('drop', { dataTransfer });
    
    // Dispatch
    divElement.nativeElement.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.onFileDropped).toHaveBeenCalledWith(mockFile);
    // Should also reset styles
    expect(divElement.classes['bg-blue-50']).toBeFalsy();
  });
});