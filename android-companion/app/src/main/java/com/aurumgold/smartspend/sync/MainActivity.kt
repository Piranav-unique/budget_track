package com.aurumgold.smartspend.sync

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import com.aurumgold.smartspend.sync.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var logAdapter: LogAdapter

    private val logsUpdateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            loadLogs()
        }
    }

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val smsGranted = permissions[Manifest.permission.RECEIVE_SMS] == true
        if (smsGranted) {
            Toast.makeText(this, "SMS Permission Granted! Monitoring Active.", Toast.LENGTH_SHORT).show()
            updateStatusUi(true)
        } else {
            Toast.makeText(this, "SMS permission needed to detect bank alerts", Toast.LENGTH_LONG).show()
            updateStatusUi(false)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupRecyclerView()
        setupListeners()
        loadWebhookUrl()
        loadLogs()
        checkAndRequestPermissions()

        // Start 24/7 foreground service
        SmsSyncService.start(this)
        updateStatusUi(true)
    }

    override fun onResume() {
        super.onResume()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(
                logsUpdateReceiver,
                IntentFilter(SmsForwarder.ACTION_LOGS_UPDATED),
                RECEIVER_NOT_EXPORTED
            )
        } else {
            registerReceiver(
                logsUpdateReceiver,
                IntentFilter(SmsForwarder.ACTION_LOGS_UPDATED)
            )
        }
        loadLogs()
    }

    override fun onPause() {
        super.onPause()
        try {
            unregisterReceiver(logsUpdateReceiver)
        } catch (e: Exception) {
            // Ignored if already unregistered
        }
    }

    private fun setupRecyclerView() {
        logAdapter = LogAdapter(emptyList())
        binding.rvLogs.layoutManager = LinearLayoutManager(this)
        binding.rvLogs.adapter = logAdapter
    }

    private fun setupListeners() {
        binding.btnSaveUrl.setOnClickListener {
            val url = binding.etWebhookUrl.text.toString().trim()
            if (url.startsWith("http://") || url.startsWith("https://")) {
                SmsForwarder.setWebhookUrl(this, url)
                Toast.makeText(this, "Webhook endpoint saved!", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, "Please enter a valid HTTP/HTTPS URL", Toast.LENGTH_SHORT).show()
            }
        }

        binding.switchService.setOnCheckedChangeListener { _, isChecked ->
            if (isChecked) {
                SmsSyncService.start(this)
                updateStatusUi(true)
                Toast.makeText(this, "24/7 Monitoring Enabled", Toast.LENGTH_SHORT).show()
            } else {
                SmsSyncService.stop(this)
                updateStatusUi(false)
                Toast.makeText(this, "Monitoring Paused", Toast.LENGTH_SHORT).show()
            }
        }

        binding.btnTestWebhook.setOnClickListener {
            sendTestBankSms()
        }

        binding.btnBatteryOpt.setOnClickListener {
            requestIgnoreBatteryOptimization()
        }

        binding.tvClearLogs.setOnClickListener {
            SmsForwarder.clearLogs(this)
            loadLogs()
            Toast.makeText(this, "History cleared", Toast.LENGTH_SHORT).show()
        }
    }

    private fun loadWebhookUrl() {
        binding.etWebhookUrl.setText(SmsForwarder.getWebhookUrl(this))
    }

    private fun loadLogs() {
        val logs = SmsForwarder.getLogs(this)
        logAdapter.updateLogs(logs)

        if (logs.isEmpty()) {
            binding.tvEmptyLogs.visibility = View.VISIBLE
            binding.rvLogs.visibility = View.GONE
        } else {
            binding.tvEmptyLogs.visibility = View.GONE
            binding.rvLogs.visibility = View.VISIBLE
        }
    }

    private fun updateStatusUi(isActive: Boolean) {
        if (isActive) {
            binding.tvStatusTitle.text = "Sync Active (Listening)"
            binding.tvStatusSubtitle.text = "Auto-forwarding bank transaction SMS"
            binding.viewStatusDot.backgroundTintList =
                ContextCompat.getColorStateList(this, R.color.status_green)
            binding.switchService.isChecked = true
        } else {
            binding.tvStatusTitle.text = "Sync Paused"
            binding.tvStatusSubtitle.text = "Tap switch to resume background monitoring"
            binding.viewStatusDot.backgroundTintList =
                ContextCompat.getColorStateList(this, R.color.status_red)
            binding.switchService.isChecked = false
        }
    }

    private fun checkAndRequestPermissions() {
        val permissions = mutableListOf(Manifest.permission.RECEIVE_SMS)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val missing = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missing.isNotEmpty()) {
            permissionLauncher.launch(missing.toTypedArray())
        }
    }

    private fun requestIgnoreBatteryOptimization() {
        val powerManager = getSystemService(POWER_SERVICE) as PowerManager
        val packageName = packageName

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!powerManager.isIgnoringBatteryOptimizations(packageName)) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:$packageName")
                }
                startActivity(intent)
            } else {
                Toast.makeText(this, "Battery optimization is already disabled! 24/7 sync is active.", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun sendTestBankSms() {
        Toast.makeText(this, "Sending simulated bank alert...", Toast.LENGTH_SHORT).show()
        val testSender = "VK-SBIINB"
        val testBody = "Dear SBI User, your A/c ending 9021 debited by Rs 150.00 on 28Nov26 by UPI/Swiggy. Avl Bal Rs 49,850.00 -SBI"

        SmsForwarder.forwardSms(
            context = this,
            sender = testSender,
            body = testBody
        ) { success, responseText ->
            if (success) {
                Toast.makeText(this, "Success! Server parsed: $responseText", Toast.LENGTH_LONG).show()
            } else {
                Toast.makeText(this, "Forward failed: $responseText", Toast.LENGTH_LONG).show()
            }
            loadLogs()
        }
    }
}
