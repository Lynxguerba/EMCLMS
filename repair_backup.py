import sys
import os

def repair_backup_file(input_path, output_path):
    print(f"Reading corrupted backup file: {input_path}")
    
    if not os.path.exists(input_path):
        print(f"Error: File not found - {input_path}")
        return

    with open(input_path, 'rb') as f:
        corrupted_data = f.read()
        
    print(f"Original file size: {len(corrupted_data)} bytes")
    
    # Reverse the Windows \r\n corruption by replacing \r\n with \n
    repaired_data = corrupted_data.replace(b'\r\n', b'\n')
    
    print(f"Repaired file size: {len(repaired_data)} bytes")
    print(f"Fixed {len(corrupted_data) - len(repaired_data)} corrupted newlines.")
    
    with open(output_path, 'wb') as f:
        f.write(repaired_data)
        
    print(f"\nSuccess! Repaired backup saved to: {output_path}")
    print("You can now upload this repaired file to the System Restoration page.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python repair_backup.py <input_corrupted_file.dump> <output_fixed_file.dump>")
        print("Example: python repair_backup.py backup_2026-07-08.dump repaired_backup.dump")
    else:
        repair_backup_file(sys.argv[1], sys.argv[2])
