enum UserRole {
  official,
  inspector,
  institute;

  String get displayName {
    switch (this) {
      case UserRole.official:
        return 'DoSJE Central/State Official';
      case UserRole.inspector:
        return 'PMU Inspection Officer';
      case UserRole.institute:
        return 'Institute / NGO Incharge';
    }
  }

  String get badgeText {
    switch (this) {
      case UserRole.official:
        return 'HQ Admin';
      case UserRole.inspector:
        return 'Field Officer';
      case UserRole.institute:
        return 'NGO Incharge';
    }
  }
}

class UserModel {
  final String id;
  final String name;
  final String designation;
  final String department;
  final String email;
  final String phone;
  final UserRole role;
  final String employeeCode;
  final String? assignedRegion;

  const UserModel({
    required this.id,
    required this.name,
    required this.designation,
    required this.department,
    required this.email,
    required this.phone,
    required this.role,
    required this.employeeCode,
    this.assignedRegion,
  });

  UserModel copyWith({
    String? id,
    String? name,
    String? designation,
    String? department,
    String? email,
    String? phone,
    UserRole? role,
    String? employeeCode,
    String? assignedRegion,
  }) {
    return UserModel(
      id: id ?? this.id,
      name: name ?? this.name,
      designation: designation ?? this.designation,
      department: department ?? this.department,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      role: role ?? this.role,
      employeeCode: employeeCode ?? this.employeeCode,
      assignedRegion: assignedRegion ?? this.assignedRegion,
    );
  }
}
