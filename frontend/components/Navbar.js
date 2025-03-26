export default {
  template: `
  <nav v-if="$route.name !== 'Course_Details'" class="navbar navbar-expand-lg bg-primary shadow-md py-3 px-4">
    <div class="container-fluid">
      <a class="navbar-brand text-white fw-bold fs-4 d-flex align-items-center" href="#">
        <img
          src="/static/assets/IIT_Madras_Logo.png"
          alt="EduNex Logo"
          style="width: 40px; height: auto; margin-right: 10px;"
        />
        LearnX
      </a>
      <button class="navbar-toggler text-white" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item">
            <router-link class="nav-link active" v-if="!is_loged_in" to="/home"></router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link text-white" v-if="is_loged_in && role === 'student'" to="/student_dashboard">Dashboard</router-link>
          </li>

          <li class="nav-item">
            <router-link class="nav-link text-white" v-if="is_loged_in && role === 'instructor'" to="/instructor_dashboard">Dashboard</router-link>
          </li>

          <li class="nav-item">
            <router-link class="nav-link text-white" v-if="is_loged_in && role === 'admin'" to="/admin_dashboard">Dashboard</router-link>
          </li>
          
          <!-- Show these only on the home page -->
          <li class="nav-item" v-if="$route.path === '/'">
            <a href="#about" class="nav-link text-white">About</a>
          </li>
          <li class="nav-item" v-if="$route.path === '/'">
            <a href="#courses" class="nav-link text-white">Courses</a>
          </li>
          <li class="nav-item" v-if="$route.path === '/'">
            <a href="#contact" class="nav-link text-white">Contact</a>
          </li>
        </ul>
        <ul class="navbar-nav ms-auto mb-2 mb-lg-0">
          <li class="nav-item dropdown" v-if="!is_loged_in">
            <a class="nav-link dropdown-toggle btn btn-light text-white px-3 ms-2" href="#" id="registerDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
              Register
            </a>
            <ul class="dropdown-menu" aria-labelledby="registerDropdown">
              <li><router-link class="dropdown-item" to="/student_registration_page">As Student</router-link></li>
              <li><router-link class="dropdown-item" to="/instructor_registration_page">As Instructor</router-link></li>
            </ul>
          </li>
          <li class="nav-item" v-if="!is_loged_in">
            <router-link class="nav-link btn btn-light text-white px-3 ms-2" to="/login">Login</router-link>
          </li>
          <li class="nav-item" v-if="is_loged_in">
            <span class="nav-link text-white fw-bold">Welcome, {{ user_name }}</span>
          </li>
          <li class="nav-item" v-if="is_loged_in">
            <button class="nav-link btn btn-light text-white px-3 ms-2" @click="logout">Logout</button>
          </li>
        </ul>
      </div>
    </div>
  </nav>
  `,
  data() {
    return {
      role: localStorage.getItem('role'),
      is_loged_in: localStorage.getItem('auth_token'),
      email: localStorage.getItem('email'),
      user_name: localStorage.getItem('user_name'),
    };
  },
  methods: {
    logout() {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('role');
      localStorage.removeItem('email');
      localStorage.removeItem('user_name');
      this.$router.push({ path: '/' });
    },
  },
};
